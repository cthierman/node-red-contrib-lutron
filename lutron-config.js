
//var Telnet = require('telnet-client');
var Net = require('net');
var events = require("events");
var Valid_Types = require('./device_types.js');

module.exports = function (RED) {

    function LutronConfigNode(config) {
        RED.nodes.createNode(this, config);
//	this.status({ fill: 'purple', shape: 'dot', text: 'disconnected' });
        this.lutronLoc = config.ipaddress;
        var node = this;
        node.connected = false;
//        node.telnet = new Telnet();
        node.port = 23;
        this.deviceMap = config.deviceMap;
        this.deviceType = config.deviceType;
        node.devices = {};
        node.lutronEvent = new events.EventEmitter();
	node.lutronEvent.setMaxListeners(100);
        var params = {
            host: this.lutronLoc,
            port: this.port,
            shellPrompt: 'GNET>',
            debug: true,
            username: 'lutron',
            password: 'integration',
            timeout: parseInt(config.timeout) || 45000
        };
	node.params = params;

	node.users = {};

	this.register = function (lutronNode) {
		node.users[lutronNode.id] = lutronNode;
		if ( Object.keys(node.users).length === 1) {
			if ( !node.connected && !node.connecting ) {
				node.connecting = true;
			}
		} else if ( node.connected ) {
			lutronNode.status({ fill: 'green', shape: 'dot', text: 'Connected' });
		} else if ( !node.connecting ) { 
			node.connecting = true;
		}
	}

	console.log("Making connection to host");
	node.client = Net.createConnection({ port: params.port, host: params.host });

        this.sendLutronCommand = function (devId, val, type) {
	    if ( type === "DEVICE" ) {
            	var str = '#DEVICE,'+ devId +','+ val +',4';
	    } else {
            	var str = '#OUTPUT,' + devId + ',1,' + val;
	    }
//            this.telnet.getSocket().write(str + '\n');
	    this.client.write(str + '\n');
        };
        this.sendLutronStatus = function (devId) {
            var str = '?OUTPUT,' + devId + ',1';
	    this.client.write(str + '\n');
//            this.telnet.getSocket().write(str + '\n');
        };

//        this.telnet.on('data', (function (self, pkt) {
	this.client.on('data', (function (self, pkt) {
	    if ( this.connected ) {
            	self.lutronRecv(pkt);
	    } else {
		var dataslice = pkt.toString().replace(/[\n\r]/g, '|').split('|');
		console.log("Entering on data connection... dataslice.length="+dataslice.length+" dataslice[0]='"+dataslice[0]+"'");
		for (var i = 0; i < dataslice.length; i++) {
		    var datapacket = dataslice[i]
		    if (datapacket !== '') {
			console.log(" for Loop dataslice["+i+"]='"+dataslice[i]+"' datapacket='"+datapacket+"'");
			if ( datapacket.substring(0, 5) === 'login' ) {
				console.log('Login requested. Sending response. ' + node.params.username)
				this.connecting = true;
				this.connected = false;
				node.client.write(node.params.username + '\r\n');
			} else if ( datapacket.substring(0, 8) === 'password' ) {
				console.log("sending password");
				node.client.write(node.params.password + '\r\n');
			} else if ( datapacket.substring(0, 5) === 'GNET>' ) {
				console.log('Login succeeded.');
				this.connected = true;
				this.connecting = false;
			}
		    }
		}
	    }
        }).bind(null, node));

//        this.telnet.on('connect', function () {
//            this.connected = true;
//	    this.connecting = false;
////	    for ( var id in node.users ) {
////		if ( node.users.hasOwnProperty(id) ) {
////			node.users[id].status({ fill: 'green', shape: 'dot', text: 'Connected' });
////		}
////	    }
//	    node.status({ fill: 'green', shape: 'dot', text: 'Connected' });
//            console.log('telnet connect');
//        });

//        this.telnet.on('close', function () {
        this.client.on('close', function () {
            this.connected = false;
	    this.connecting = false;
	    node.status({ fill: 'red', shape: 'dot', text: 'Disconnected' });
            console.log('telnet close');
        });
//        this.telnet.on('error', function (text) {
        this.client.on('error', function (text) {
            this.connected = false;
	    this.connecting = false;
	    node.status({ fill: 'red', shape: 'dot', text: 'Disconnected' });
            console.log('telnet error: '+text);
        });
//        this.telnet.on('failedlogin', function (text) {
//            this.connected = false;
//	    this.connecting = false;
//	    node.status({ fill: 'red', shape: 'dot', text: 'Disconnected' });
//            console.log('telnet failed login: '+ text);
//        });
        this.lutronRecv = function (data) {
            var st = data.toString().trim();
            var cmd = st[0]
            var cs = st.substring(1).split(',')
            var type = cs[0]
            if (cs.length > 3) {
                var deviceId = parseInt(cs[1])
                var action = parseInt(cs[2])
                var param = parseFloat(cs[3])
// DEBUG
                              console.log('[',cmd,',', type, ',',deviceId,
                              ',', action,',', param,']')
                this.lutronEvent.emit('data', {
                    cmd: cmd,
                    type: type,
                    deviceId: deviceId,
                    action: action,
                    param: param
                });
                if (cmd == '~') {
                    // event notification
                    if (type == 'OUTPUT' && action == 1) {
                        this.devices[deviceId] = param
                        //this.scheduleLoxoneUpdate(deviceId, action, param)
                    } else if (type == 'DEVICE') {
                        //this.scheduleLoxoneUpdate(deviceId, action, param)
                    }
                }
            }
        }
//        this.telnet.connect(params);
    }
    RED.nodes.registerType('lutron-config', LutronConfigNode);
}
