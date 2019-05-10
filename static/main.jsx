const ERROR_PAGE = 'ErrorPage'
const ENTRANCE = 'Entrance'
const DISPLAY_PATH = 'DisplayPath'
const ANALYSE_PATH = 'AnalysePath'
const DISPLAY = 'Display'
const ANAlYSE = 'Analyse'


class ErrorPage extends React.Component {
    render() {
        return (
            <div className='row'>
                <p className='col text-center text-danger'>{this.props.msg}</p>
            </div>
        )
    }
}

class Entrance extends React.Component {
    render() {
        return (
            <div className='row'>
                <div className='col'>
                    <div className='row justify-content-center'>
                        <input className='col-6 btn-lg btn-outline-dark'
                               type='button'
                               onClick={e => this.props.go(DISPLAY_PATH)} value='Display' />
                    </div>
                    <div className='row'>
                        <p className='col'></p>
                    </div>
                    <div className='row justify-content-center'>
                        <input className='col-6 btn-lg btn-outline-dark'
                               type='button'
                               onClick={e => this.props.go(ANALYSE_PATH)} value='Analyse' />
                    </div>
                </div>
            </div>
        )
    }
}

class DisplayPath extends React.Component {
    render() {
        return (
            <form>
                <div class='form-group'>
                    <label for='saveLocation' className='text-white'>Please enter the save location:</label>
                    <input type="text" id="saveLocation" className='form-control' placeholder='Save Location'/>
                </div>
                <input className='btn-outline-dark' type='button' onClick={e => this.props.submit('display',
                                                                           document.getElementById('saveLocation').value,
                                                                           DISPLAY)} value='Submit' />
                <input className='btn-outline-dark' type='button' onClick={e => this.props.submit('display', 'None',
                                                                           DISPLAY)} value="Don't Save" />
            </form>
        )
    }
}

class AnalysePath extends React.Component {
    render() {
        return (
            <form>
                <div class='form-group'>
                    <label for='historyLocation' className='text-white'>Please enter the history file location:</label>
                    <input type='text' id='historyLocation' className='form-control' placeholder='History Location'/>
                </div>
                <input className='btn-outline-dark' type='button' onClick={e => this.props.submit('analyse',
                                                                           document.getElementById('historyLocation').value,
                                                                           ANAlYSE)} value='Submit' />
            </form>
        )
    }
}

class Display extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            roll: 0,
            pitch: 0,
            yaw: 0,
        }
        this.drawAH = this.drawAH.bind(this)
    }

    drawAH() {
        let ctx = document.getElementById('AH').getContext('2d')
        ctx.clearRect(0, 0, 750, 750)
        drawInside(ctx, this.state.roll, this.state.pitch)
        drawOutside(ctx, this.state.roll)
        drawIndicator(ctx)
        drawCompass(ctx, this.state.yaw)
        drawReading(ctx, this.state.roll, this.state.pitch, this.state.yaw)
    }

    componentDidMount() {
        this.ws = new WebSocket('ws://127.0.0.1:8080/display')
        this.ws.onmessage = e => {
            let [roll, pitch, yaw] = JSON.parse(e.data)
            this.setState({
                roll: roll,
                pitch: pitch,
                yaw: yaw,
            }, () => {
                this.drawAH()
            })
        }
    }

    componentWillUnmount() {
        this.ws.close()
    }

    render() {
        return (
            <div className='row  justify-content-center'>
                <canvas id='AH' width='750' height='750'></canvas>
            </div>
        )
    }
}

class Analyse extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            currentChart: 'RPY',
            orders: {
                RPY: 'None',
                ACC: 'None',
                GYR: 'None',
                MAG: 'None',
            },
            freqs: {
                RPY: 0.2,
                ACC: 0.2,
                GYR: 0.2,
                MAG: 0.2,
            },
            data: {
                RPY: null,
                ACC: null,
                GYR: null,
                MAG: null,
            },
            charts: {
                RPY: null,
                ACC: null,
                GYR: null,
                MAG: null,
            },
        }
        this.selectChart = this.selectChart.bind(this)
        this.selectOrder = this.selectOrder.bind(this)
        this.selectFreq = this.selectFreq.bind(this)
        this.filter = this.filter.bind(this)
        this.drawChart = this.drawChart.bind(this)
        this.analyse = this.analyse.bind(this)
    }

    componentDidMount() {
        for (let chart in this.state.charts) {
            this.analyse(chart, this.state.orders[chart], this.state.freqs[chart])
        }
    }

    selectChart(event) {
        let prevChart = this.state.currentChart
        let currentChart = event.target.value
        this.setState({
            currentChart: currentChart,
        })
        document.getElementById(prevChart+'Chart').style.display = 'none'
        document.getElementById(currentChart+'Chart').style.display = 'block'
    }

    selectOrder(event) {
        let chart = this.state.currentChart
        this.state.orders[chart] = event.target.value
        this.setState({
            orders: this.state.orders,
        })
    }

    selectFreq(event) {
        let chart = this.state.currentChart
        this.state.freqs[chart] = parseFloat(event.target.value)
        this.setState({
            freqs: this.state.freqs,
        })
    }

    filter() {
        let chart = this.state.currentChart
        let order = this.state.orders[chart] 
        let freq = this.state.freqs[chart]
        if (freq === 0) {
            freq = 0.001
        } else if (freq === 1) {
            freq = 0.999
        }
        this.analyse(chart, order, freq)
    }

    drawChart(name) {
        let data = this.state.data[name]
        // Decimation for performance.
        let maxPoints = 200;
        let interval = Math.floor(data.length/maxPoints)
        interval = interval ? interval : 1
        let dataX = [], dataY = [], dataZ = [], timeStamps = []
        for (let i = 0; i < data.length; i = i + interval) {
            dataX.push(data[i][0])
            dataY.push(data[i][1])
            dataZ.push(data[i][2])
            timeStamps.push((i * 0.02).toFixed(2))
        }
        let ctx = document.getElementById(name+'Chart').getContext('2d')
        let title, yLabel
        switch (name) {
            case 'RPY':
                title = 'Euler Angles'
                yLabel = 'Degree (°)'
                break
            case 'ACC':
                title = 'Acceleration'
                yLabel = 'g'
                break
            case 'GYR':
                title = 'Gyroscope'
                yLabel = 'dps'
                break
            case 'MAG':
                title = 'Magnetic Field'
                yLabel = 'uT'
                break
        }
        if (this.state.charts[name]) {
            let chart = this.state.charts[name]
            chart.data.datasets.forEach(dataset => {
                switch (dataset.label) {
                    case 'Roll':
                    case 'X-Axis':
                        dataset.data = dataX
                        break
                    case 'Pitch':
                    case 'Y-Axis':
                        dataset.data = dataY
                        break
                    case 'Yaw':
                    case 'Z-Axis':
                        dataset.data = dataZ
                        break
                }
            })
            chart.update()
        } else {
            Chart.defaults.global.defaultFontColor = 'white'
            let chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: timeStamps,
                    datasets: [
                        {
                            label: (name === 'RPY') ? 'Roll' : 'X-Axis',
                            data: dataX,
                            fill: false,
                            borderColor: 'rgba(255, 99, 132, 0.4)',
                            pointBackgroundColor: 'rgba(255, 99, 132, 0.4)',
                            pointBorderColor: 'rgba(255, 99, 132, 0.4)',
                        },
                        {
                            label: (name === 'RPY') ? 'Pitch' : 'Y-Axis',
                            data: dataY,
                            fill: false,
                            borderColor: 'rgba(54, 162, 235, 0.4)',
                            pointBackgroundColor: 'rgba(54, 162, 235, 0.4)',
                            pointBorderColor: 'rgba(54, 162, 235, 0.4)',
                        },
                        {
                            label: (name === 'RPY') ? 'Yaw' : 'Z-Axis',
                            data: dataZ,
                            fill: false,
                            borderColor: 'rgba(75, 192, 192, 0.4)',
                            pointBackgroundColor: 'rgba(75, 192, 192, 0.4)',
                            pointBorderColor: 'rgba(75, 192, 192, 0.4)',
                        },
                    ],
                },
                options: {
                    title: {
                        display: true,
                        text: title,
                        fontSize: 20,
                    },
                    scales: {
                        xAxes: [{
                            ticks: {
                                maxTicksLimit: 25,
                            },
                            scaleLabel: {
                                display: true,
                                labelString: 'Time (second)',
                            },
                        }],
                        yAxes: [{
                            scaleLabel: {
                                display: true,
                                labelString: yLabel,
                            },
                        }],
                    },
                },
            })
            this.state.charts[name] = chart
            this.setState({
                charts: this.state.charts
            })
        }
    }

    analyse(name, order, freq) {
        const init = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                order: order,
                freq: freq,
            }),
        }
        let req = new Request('analyse', init)
        fetch(req)
            .then(resp => {
                return resp.text()
            })
            .then(text => {
                let data = JSON.parse(text)
                this.state.data[name] = data
                this.setState({
                    data: this.state.data,
                }, () => {
                    this.drawChart(name)
                })
            })
    }

    render() {
        return (
            <div>
                <div className='row form-group justify-content-center'>
                    <select id='selectChart' className='col-2 form-control btn-secondary'
                            value={this.state.currentChart} onChange={this.selectChart}>
                        <option value='RPY' className='btn-secondary'>RPY</option>
                        <option value='ACC' className='btn-secondary'>ACC</option>
                        <option value='GYR' className='btn-secondary'>GYR</option>
                        <option value='MAG' className='btn-secondary'>MAG</option>
                    </select>
                    <p className='col-1'></p>
                    <select id='selectOrder' className='col-2 form-control btn-secondary'
                            value={this.state.orders[this.state.currentChart]} onChange={this.selectOrder}>
                        <option value='None' className='btn-secondary'>No Filter</option>
                        <option value='1' className='btn-secondary'>Order 1</option>
                        <option value='2' className='btn-secondary'>Order 2</option>
                        <option value='3' className='btn-secondary'>Order 3</option>
                    </select>
                    <input type="range" style={{'margin': 'auto 8px', 'padding': '0px'}} className='col-1'
                           id="selectFreq" min="0" max="1" step="0.1"
                           value={this.state.freqs[this.state.currentChart]} onChange={this.selectFreq}/>
                    <input type='button' className='col-1 btn btn-secondary' onClick={this.filter} value='Filter' />
                </div>
                <div className='row'>
                    <canvas id="RPYChart" className='col' style={{display: 'block'}}></canvas>
                    <canvas id="ACCChart" className='col' style={{display: 'none'}}></canvas>
                    <canvas id="GYRChart" className='col' style={{display: 'none'}}></canvas>
                    <canvas id="MAGChart" className='col' style={{display: 'none'}}></canvas>
                </div>
            </div>   
        )
    }
}


class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            currentPanel: ENTRANCE,
            errorMessage: '',
        }
        this.setErrorMessage = this.setErrorMessage.bind(this)
        this.goPanel = this.goPanel.bind(this)
        this.buildPanel = this.buildPanel.bind(this)
        this.submitPath = this.submitPath.bind(this)
    }

    setErrorMessage(msg) {
        this.setState({
            errorMessage: msg,
        })
    }

    goPanel(panelName) {
        this.setState({
            currentPanel: panelName,
        })
    }

    buildPanel() {
        let panel
        switch (this.state.currentPanel) {
            case ERROR_PAGE:
                panel = <ErrorPage go={this.goPanel} msg={this.state.errorMessage} />
                break
            case ENTRANCE:
                panel = <Entrance go={this.goPanel} />
                break
            case DISPLAY_PATH:
                panel = <DisplayPath submit={this.submitPath} go={this.goPanel} />
                break
            case ANALYSE_PATH:
                panel = <AnalysePath submit={this.submitPath} go={this.goPanel} />
                break
            case DISPLAY:
                panel = <Display go={this.goPanel} />
                break
            case ANAlYSE:
                panel = <Analyse go={this.goPanel} />
                break
        }
        return panel
    }

    submitPath(type, path, panelName) {
        const init = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                [type]: path,
            }),
        }
        let req = new Request('path', init)
        fetch(req)
            .then(resp => {
                return resp.text()
            })
            .then(text => {
                if (text === 'ACK') {
                    this.goPanel(panelName)
                } else {
                    this.setErrorMessage(text)
                    this.goPanel(ERROR_PAGE)
                }
            })
    }

    render() {
        return (
            <div className='container-fluid bg-dark' style={{'height': '100%'}}>
                <div className='row align-items-center' style={{'height': '10%'}}>
                    <div className='col'>
                        <a onClick={e => this.goPanel(ENTRANCE)}>
                            <h1 className='text-center text-white'>AHRS</h1>
                        </a>
                    </div>
                </div>
                {this.buildPanel()}
            </div>
        )
    }
}


ReactDOM.render(
    <App />,
    document.getElementById('root')
)