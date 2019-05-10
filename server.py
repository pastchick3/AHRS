import asyncio
import json
import re
from itertools import cycle
from threading import Thread
from time import sleep

import serial
from aiohttp import web
from scipy import signal


class Sensor:

    # Serial message patterns.
    re_patterns = [
        r'(RPY) - Roll: (-?\d+) \| Pitch: (-?\d+) \| Yaw: (-?\d+)',
        r'(ACC) - x: (-?\d+) \| y: (-?\d+) \| z: (-?\d+)',
        r'(GYR) - x: (-?\d+) \| y: (-?\d+) \| z: (-?\d+)',
        r'(MAG) - x: (-?\d+) \| y: (-?\d+) \| z: (-?\d+)',
    ]

    def __init__(self, port='COM4', history=None):
        self._port = port
        self._close = False
        self._indexes = {
            'RPY': 0,
            'ACC': 0,
            'GYR': 0,
            'MAG': 0,
        }
        if history is not None:
            self._history = history
            self._thread = None
        else:
            self._history = {
                'RPY': [],
                'ACC': [],
                'GYR': [],
                'MAG': [],
            }
            self._thread = Thread(target=self._update)
            self._thread.start()

    def _update(self):
        self._ser = serial.Serial(self._port, 115200, timeout=0.1)
        self._ser.readline()    # primer reading x2
        self._ser.readline()
        temp = {}
        while not self._close:
            while True:
                try:
                    line = self._ser.readline().decode()
                except UnicodeDecodeError:
                    # Truncated unicode may appear when the program just starts.
                    continue
                else:
                    break
            if line.startswith('END') and len(temp) == 4:
                for k, v in temp.items():
                    self._history[k].append(v)
                temp = {}
            else:
                for pattern in self.re_patterns:
                    match = re.search(pattern, line)
                    t = []
                    if match:
                        if match.group(1) == 'RPY':
                            for i in range(2, 5):
                                v = float(match.group(i)) / 100
                                t.append(v)
                            t[1] = -t[1]    # pitch is reversed.
                        elif match.group(1) == 'ACC':
                            for i in range(2, 5):
                                v = -float(match.group(i)) / (65536 / 2) * 2    # So do ACC
                                t.append(v)
                        elif match.group(1) == 'GYR':
                            for i in range(2, 5):
                                v = float(match.group(i)) / (65536 / 2) * 2000
                                t.append(v)
                        elif match.group(1) == 'MAG':
                            for i in range(2, 5):
                                v = float(match.group(i)) * 0.15
                                t.append(v)
                        temp[match.group(1)] = t
                        break

    def next(self, key):
        '''Get the next data point, and block until data are ready.'''
        key = key.upper()
        index = self._indexes[key]
        seq = self._history[key]
        while index >= len(seq):
            sleep(0.05)
        self._indexes[key] = index + 1
        return seq[index]

    def save(self, path):
        with open(path, encoding='utf-8', mode='w') as file:
            json.dump(self._history, file)

    def close(self):
        self._close = True
        while self._thread and self._thread.is_alive():
            sleep(0.1)


async def mock_display_handler(request):
    '''For testing when the board is not connected.'''
    roll = cycle(range(10, 100, 10))
    pitch = cycle(range(10, 100, 10))
    yaw = cycle(range(10, 100, 10))
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    while True:
        try:
            await ws.receive(timeout=0.01)
        except asyncio.TimeoutError:
            sleep(0.5)
            # await ws.send_json([next(roll), next(pitch), next(yaw)])
            await ws.send_json([29.89, 55.37, 10.97])
        else:
            break
    return ws

async def display_handler(request):
    '''Handler for AH'''
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    sensor = Sensor()
    while True:
        try:
            await ws.receive(timeout=0.01)
        except asyncio.TimeoutError:
            await ws.send_json(sensor.next('RPY'))
        else:
            break
    if request.app['files']['save_file'] != 'None':
        sensor.save(request.app['files']['save_file'])
    sensor.close()
    return ws

async def analyse_handler(request):
    '''Handler for charts'''
    param = await request.json()
    name = param['name']
    order = param['order']
    freq = param['freq']
    with open(request.app['files']['history_file'], encoding='utf-8') as file:
        history = json.load(file)
        data = history[name]
    # Filter
    if order != 'None':
        b, a = signal.butter(int(order), freq, 'lowpass')
        data_x = [v[0] for v in data]
        data_y = [v[1] for v in data]
        data_z = [v[2] for v in data]
        data_x = signal.filtfilt(b, a, data_x)
        data_y = signal.filtfilt(b, a, data_y)
        data_z = signal.filtfilt(b, a, data_z)
        data = [[v_x, v_y, v_z] for v_x, v_y, v_z in zip(data_x, data_y, data_z)]
    return web.json_response(data)

async def path_handler(request):
    '''Receive paths to history json.'''
    path_obj = await request.json()
    if 'display' in path_obj:
        if path_obj['display'] == 'None':
            app['files']['save_file'] = path_obj['display']
            text = 'ACK'
        else:
            try:
                with open(path_obj['display'], encoding='utf-8', mode='w') as _:
                    app['files']['save_file'] = path_obj['display']
            except Exception as exc:
                text = repr(exc)
            else:
                text = 'ACK'
    elif 'analyse' in path_obj:
        try:
            with open(path_obj['analyse'], encoding='utf-8') as _:
                app['files']['history_file'] = path_obj['analyse']
        except Exception as exc:
            text = repr(exc)
        else:
            text = 'ACK'
    else:
        text = 'Invalid path type!'
    return web.Response(text=text)


app = web.Application()
app['files'] = {
    'save_file': None,
    'history_file': None,
}
app.add_routes([
    web.get('/display', mock_display_handler),
    # web.get('/display', display_handler),
    web.post('/analyse', analyse_handler),
    web.post('/path', path_handler),
    web.static('/', './static'),
])
web.run_app(app)
