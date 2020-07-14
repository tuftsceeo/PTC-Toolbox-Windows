//Carter Silvey
//Spike Prime Vuforia

// Variables
var serial = require('./serial.js');
var server = require('@libraries/hardwareInterfaces');
var settings = server.loadHardwareInterface(__dirname);
var noble = require('@abandonware/noble');

var colors = ["black", "violet", "blue", "cyan", "green", "yellow", "red", "white"]
var portLetters = ["A", "B", "C", "D", "E", "F"]
var ports = ["none", "none", "none", "none", "none", "none"]
var sensorData, arr
var distance, color, accel, accelArr
var [motor1, motor2, motor3, distanceSensor, colorSensor, forceSensor] = ports
var firstMotor, secondMotor, thirdMotor
var TOOL_NAME = "code"
var runMotors = true

let objectName = 'spikeNode';

exports.enabled = settings('enabled');
exports.configurable = true;

try {
    serial.openPort()
    serial.sendFile('initialize.py')
    initializePorts()
} catch(e) {
    console.log('Spike Prime NOT connected')
}

if (exports.enabled){
    // Code executed when your robotic addon is enabled
    setup();

    console.log('Spike: Settings loaded: ', objectName)

    console.log("Spike is connected");

    function setup() {
    	exports.settings = {
    		// Object
            spikeName: {
    			value: settings('objectName', 'spikeNode'),
    			type: 'text',
    			default: 'spikeNode',
    			disabled: false,
    			helpText: 'The name of the object that connects to this hardware interface.'
    		}
    	};
    }

    objectName = exports.settings.spikeName.value;
    console.log("Spike" + objectName)

    server.addEventListener('reset', function () {
    	settings = server.loadHardwareInterface(__dirname);
    	setup();

    	console.log('Spike: Settings loaded: ', objectName);
	});
}

// Starts the interface with the hardware
function startHardwareInterface() {
	console.log('Spike: Starting up')

	server.enableDeveloperUI(true)

    // Adds sensor nodes to the object on the app
    server.addNode(objectName, TOOL_NAME, "stopMotors", "node");
	server.addNode(objectName, TOOL_NAME, "color", "node");
    server.addNode(objectName, TOOL_NAME, "distance", "node");
    server.addNode(objectName, TOOL_NAME, "force", "node");
    server.addNode(objectName, TOOL_NAME, "accelerometerX", "node");
    server.addNode(objectName, TOOL_NAME, "accelerometerY", "node");
    server.addNode(objectName, TOOL_NAME, "accelerometerZ", "node");

    // Adds motor nodes to the object on the app
    server.addNode(objectName, TOOL_NAME, "motor1", "node");
    server.addNode(objectName, TOOL_NAME, "motor2", "node");
    server.addNode(objectName, TOOL_NAME, "motor3", "node");

    // Constantly sort the sensor data
    setInterval(() => { sortSensor(); }, 10);

    // Listens for the stopMotors node
	server.addReadListener(objectName, TOOL_NAME, "stopMotors", function(data){
		// When true, stop the Spike motors
        if(data.value == 1) {
            console.log('motors off')
            stopMotors()
		}
        if(data.value == 0) {
            runMotors = true
        }
	});

    // Listen for the motor1 node
    server.addReadListener(objectName, TOOL_NAME, "motor1", function(data){
        if(runMotors) {
            setTimeout(() => { serial.writePort(motor1 + ".start(" + Math.round(data.value/2) + ")\r\n") }, 0);
        }
        else {
            stopMotors()
        }
    });

    // Listen for the motor2 node
    server.addReadListener(objectName, TOOL_NAME, "motor2", function(data){
        if(runMotors) {
            setTimeout(() => { serial.writePort(motor2 + ".start(" + Math.round(-1 * data.value/2) + ")\r\n") }, 0);
        }
        else {
            stopMotors()
        }
    });

    // Listen for the motor3 node
    server.addReadListener(objectName, TOOL_NAME, "motor3", function(data){
        if(runMotors) {
            setTimeout(() => { serial.writePort(motor3 + ".start(" + Math.round(-1 * data.value/2) + ")\r\n") }, 0);
        }
        else {
            stopMotors()
        }
    });

    // Constantly read the sensor data
    setInterval(() => { continuousSensor(); }, 50)
	updateEvery(0, 10);
}

// Gets the port ordering from the Spike Prime, which initialized itself
function initializePorts() {
    sensorData = readSensor()
    if (sensorData.includes('[') && sensorData.includes(',')) {
        sensorData = sensorData.substring(1, sensorData.length - 2)
        sensorData = sensorData.replace(/'/g, '')
        sensorData = sensorData.replace(/ /g, '')
        sensorData = sensorData.split(',')
        for (i = 0; i < sensorData.length; i++) {
            ports[i] = sensorData[i]
        }
        console.log(ports)
        definePorts()
        //setTimeout(() => { continuousSensor(); }, 1000)
    }
    else {
        setTimeout(() => { initializePorts(); }, 0);
    }
}

// Change the names of the motors and sensor to be their corresponding ports
function definePorts() {
    if (ports.indexOf('motor') != -1) {
        firstMotor = ports.indexOf('motor')
        motor1 = portLetters[firstMotor]
        if (ports.indexOf('motor', firstMotor + 1) != -1) {
            secondMotor = ports.indexOf('motor', firstMotor + 1)
            motor2 = portLetters[secondMotor]
            if (ports.indexOf('motor', secondMotor + 1) != -1) {
                thirdMotor = ports.indexOf('motor', secondMotor + 1)
                motor3 = portLetters[thirdMotor]
            }
        }
    }
    if (ports.indexOf('color') != -1) {
        colorSensor = portLetters[ports.indexOf('color')]
    }
    if (ports.indexOf('distance') != -1) {
        distanceSensor = portLetters[ports.indexOf('distance')]
    }
    if (ports.indexOf('force') != -1) {
        forceSensor = portLetters[ports.indexOf('force')]
    }
    console.log(motor1, motor2, motor3, colorSensor, distanceSensor, forceSensor)
}


// Read data from the Spike Prime
function readSensor() {
    sensorData = serial.getSensor()
    return sensorData
}

// Tells the Spike to continutiously print color, force, distance, and accelerometer data
function continuousSensor() {
    serial.writePort("read()\r\n")
}

// Sorts the sensor data and sends it to the appropriate process function
async function sortSensor() {
    sensorData = readSensor()
    sensorData = sensorData.replace(/ /g, '')
    //console.log(sensorData)
    arr = sensorData.split(',')
    if (colors.includes(sensorData) && sensorData.toString().length > 0) {
        processColor(sensorData)
    }
    else if (parseInt(sensorData) <= 1 && sensorData.toString().length > 0) {
        processForce(sensorData)
    }
    else if (!isNaN(sensorData) && parseInt(sensorData) > 1 && sensorData.toString().length > 0) {
        processDistance(sensorData)
    }
    else if (arr.length == 3) {
        processAccelerometer(sensorData)
    }
}

// Processes distance data
function processDistance(sensorData) {
    distance = sensorData
    //console.log(distance)
    server.write(objectName, TOOL_NAME, "distance", server.map(distance, 0, 100, 0, 100), "f")
}

// Processes color data
function processColor(sensorData) {
    color = sensorData
    //console.log(color)
    server.write(objectName, TOOL_NAME, "color", color, "f")
}

// Processes accelerometer data
function processAccelerometer(sensorData) {
    accel = sensorData
    accel = accel.replace(/\(/g, '')
    accel = accel.replace(/\)/g, '')
    accelArr = accel.split(',').map(x=>+x)
    //console.log(accelArr)
    server.write(objectName, TOOL_NAME, "accelerometerX", server.map(accelArr[0], -5000, 5000, -5000, 5000), "f")
    server.write(objectName, TOOL_NAME, "accelerometerY", server.map(accelArr[1], -5000, 5000, -5000, 5000), "f")
    server.write(objectName, TOOL_NAME, "accelerometerZ", server.map(accelArr[2], -5000, 5000, -5000, 5000), "f")
}

// Process force data
function processForce(sensorData) {
    force = sensorData * 10
    //console.log(force)
    server.write(objectName, TOOL_NAME, "force", server.map(force, 0, 10, 0, 10), "f")
}

// Send Control + C a few times to kill anything that is running
function stopMotors() {
    runMotors = false
    if (motor1 != "none") {
        serial.writePort(motor1 + ".stop()\r\n")
    }
    if (motor2 != "none") {
        serial.writePort(motor2 + ".stop()\r\n")
    }
    if (motor3 != "none") {
        serial.writePort(motor3 + ".stop()\r\n")
    }
}

function updateEvery(i, time){
	setTimeout(() => {
		updateEvery(++i, time);
	}, time)
}

server.addEventListener("initialize", function () {
    if (exports.enabled) setTimeout(() => { startHardwareInterface() }, 10000)
});

server.addEventListener("shutdown", function () {
    stopMotors()
});