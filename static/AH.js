let sin = Math.sin
let cos = Math.cos
let sqrt = Math.sqrt
let abs = Math.abs
let PI = Math.PI

let COLOR_SKY = '#0099FF'
let COLOR_GROUND = '#996600'
let COLOR_BLACK = '#000000'
let COLOR_WHITE = '#FFFFFF'
let COLOR_INDOCATOR = '#FF9900'
let COLOR_WARNING = '#FF0000'

function rotate(prevX, prevY, theta) {
    // Rotate (prevX, prevY) theta rad.
    // theta follows the common math convention.
    relaX = prevX - 375
    relaY = 375 - prevY
    let len = sqrt(relaX**2+relaY**2)
    let prevAngle = Math.atan2(relaY, relaX)
    let nowAngle = prevAngle + theta
    let nowX = 375 + cos(nowAngle) * len
    let nowY = 375 - sin(nowAngle) * len
    return [nowX, nowY]
}

function drawReading(ctx, roll, pitch, yaw) {
    let point
    let config = [
        [20, 'Roll', roll],
        [0, 'Pitch', pitch],
        [-20, 'Yaw', yaw],
    ]
    ctx.lineWidth = 5
    ctx.strokeStyle = COLOR_BLACK
    for (let [angle, name, reading] of config) {
        ctx.beginPath()
        point = rotate(375, 25, (angle-45)/180*PI)
        ctx.arc(point[0], point[1], 40, 0, 2*PI)
        ctx.stroke()
        // Warn the user when pitch < -60 degrees or > 60 degrees
        if (name === 'Pitch' && abs(reading) >= 50) {
            ctx.fillStyle = COLOR_WARNING
        } else {
            ctx.fillStyle = COLOR_BLACK
        }
        ctx.fill()
        // Reading
        ctx.font = '20px sans-serif'
        ctx.textAlign = "center"
        ctx.fillStyle = COLOR_WHITE
        ctx.fillText(name, point[0], point[1]-8)
        ctx.fillText(reading+'°', point[0], point[1]+22)
    }
}

function drawCompass(ctx, yaw) {
    yaw = yaw / 180 * PI
    let point
    // Scale
    ctx.lineWidth = 5
    ctx.strokeStyle = COLOR_WHITE
    for (let multi = 0; multi < 12; multi++) {
        let angle = multi / 6 * PI + yaw
        let len = (multi % 3) ? 25 : 50
        ctx.beginPath()
        point = rotate(600, 375, angle)
        ctx.moveTo(point[0], point[1])
        point = rotate(600+len, 375, angle)
        ctx.lineTo(point[0], point[1])
        ctx.stroke()
        // North Indicator
        if (multi == 3) {
            ctx.beginPath()
            ctx.arc(375, 375, 250, -angle-1.5*PI/72, -angle+1.5*PI/72, false)
            point = rotate(600+len, 375, angle)
            ctx.lineTo(point[0], point[1])
            ctx.closePath()
            ctx.stroke()
            ctx.fillStyle = COLOR_WHITE
            ctx.fill()
        }
    }
    // Plane Indicator
    ctx.lineWidth = 5
    ctx.strokeStyle = COLOR_INDOCATOR
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(375, 375, 275, -PI/2+1.5*PI/72, -PI/2-1.5*PI/72, true)
    ctx.lineTo(375, 125)
    ctx.closePath()
    ctx.stroke()
    ctx.fillStyle = COLOR_INDOCATOR
    ctx.fill()
}

function drawInside(ctx, roll, pitch) {
    roll = (roll / 180) * PI
    pitch = (pitch > 60) ? 60 : pitch    // max pitch: 60 degrees
    pitch = (pitch < -60) ? -60 : pitch    // min pitch: -60 degrees
    let offset = pitch / 10 * 20    // 10 degrees = 20 pixels offset
    let point
    // Sky
    ctx.lineWidth = 5
    ctx.strokeStyle = COLOR_SKY
    ctx.beginPath()
    point = rotate(250, 250, roll)
    ctx.moveTo(point[0], point[1])
    point = rotate(500, 250, roll)
    ctx.lineTo(point[0], point[1])
    point = rotate(500, 375+offset, roll)
    ctx.lineTo(point[0], point[1])
    point = rotate(250, 375+offset, roll)
    ctx.lineTo(point[0], point[1])
    ctx.closePath()
    ctx.stroke()
    ctx.fillStyle = COLOR_SKY
    ctx.fill()
    // Ground
    ctx.lineWidth = 5
    ctx.strokeStyle = COLOR_GROUND
    ctx.beginPath()
    point = rotate(250, 375+offset, roll)
    ctx.moveTo(point[0], point[1])
    point = rotate(500, 375+offset, roll)
    ctx.lineTo(point[0], point[1])
    point = rotate(500, 500, roll)
    ctx.lineTo(point[0], point[1])
    point = rotate(250, 500, roll)
    ctx.lineTo(point[0], point[1])
    ctx.closePath()
    ctx.stroke()
    ctx.fillStyle = COLOR_GROUND
    ctx.fill()
    // Horizon
    ctx.lineWidth = 5
    ctx.strokeStyle = COLOR_WHITE
    ctx.beginPath()
    point = rotate(250, 375+offset, roll)
    ctx.moveTo(point[0], point[1])
    point = rotate(500, 375+offset, roll)
    ctx.lineTo(point[0], point[1])
    ctx.stroke()
    // Scale
    ctx.lineWidth = 2
    ctx.strokeStyle = COLOR_WHITE
    let pitchScales = [-120, -100, -80, -60, -40, -20, 0,
                       20, 40, 60, 80, 100, 120]
    for (let pitchScale of pitchScales) {
        let scale_y = 375 + pitchScale + offset
        let len = (pitchScale % 60) ? 50 : 100
        // Confine scales inside the AH.
        if (scale_y >= 250 && scale_y <= 500) {
            ctx.beginPath()
            point = rotate(375-len/2, scale_y, roll)
            ctx.moveTo(point[0], point[1])
            point = rotate(375+len/2, scale_y, roll)
            ctx.lineTo(point[0], point[1])
            ctx.stroke()
        }
    }
}

function drawOutside(ctx, roll) {
    roll = (roll / 180) * PI
    let point
    // Sky
    ctx.lineWidth = 5
    ctx.strokeStyle = COLOR_BLACK
    ctx.beginPath()
    ctx.arc(375, 375, 200, PI-roll, 2*PI-roll, false)
    point = rotate(500, 375, roll)
    ctx.lineTo(point[0], point[1])
    ctx.arc(375, 375, 125, -roll, PI-roll, true)
    point = rotate(175, 375, roll)
    ctx.lineTo(point[0], point[1])
    ctx.stroke()
    ctx.fillStyle = COLOR_SKY
    ctx.fill()
    // Ground
    ctx.lineWidth = 5
    ctx.strokeStyle = COLOR_BLACK
    ctx.beginPath()
    ctx.arc(375, 375, 200, PI-roll, -roll, true)
    point = rotate(500, 375, roll)
    ctx.lineTo(point[0], point[1])
    ctx.arc(375, 375, 125, -roll, PI-roll, false)
    point = rotate(175, 375, roll)
    ctx.lineTo(point[0], point[1])
    ctx.stroke()
    ctx.fillStyle = COLOR_GROUND
    ctx.fill()
    // Scale
    ctx.lineWidth = 5
    ctx.strokeStyle = COLOR_WHITE
    for (let angle of [0, 0.5*PI, PI]) {
        ctx.beginPath()
        ctx.moveTo(375+cos(angle+roll)*180, 375-sin(angle+roll)*180)
        ctx.lineTo(375+cos(angle+roll)*125, 375-sin(angle+roll)*125)
        ctx.stroke()
    }
    for (let angle of [1/6*PI, 2/6*PI, 4/6*PI, 5/6*PI]) {
        ctx.beginPath()
        ctx.moveTo(375+cos(angle+roll)*160, 375-sin(angle+roll)*160)
        ctx.lineTo(375+cos(angle+roll)*125, 375-sin(angle+roll)*125)
        ctx.stroke()
    }
}

function drawIndicator(ctx) {
    // Central Point
    ctx.rect(370, 370, 10, 10)
    ctx.fillStyle = COLOR_INDOCATOR
    ctx.fill()
    // Wings
    ctx.lineWidth = 8
    ctx.strokeStyle = COLOR_INDOCATOR
    ctx.beginPath()
    ctx.moveTo(275, 375)
    ctx.lineTo(325, 375)
    ctx.arc(375, 375, 50, PI, 0, true)
    ctx.lineTo(475, 375)
    ctx.stroke()
    // Upper Indicator
    ctx.lineWidth = 5
    ctx.strokeStyle = COLOR_INDOCATOR
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(375, 375, 200, 53/36*PI, 55/36*PI, false)
    ctx.lineTo(375, 200)
    ctx.lineTo(375+cos(19/36*PI)*200, 375-sin(19/36*PI)*200)
    ctx.stroke()
    ctx.fillStyle = COLOR_INDOCATOR
    ctx.fill()
}