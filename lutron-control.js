var Valid_Types = require('./device_types.js');
module.exports = function (RED) {

    function LutronControlNode(control) {
        RED.nodes.createNode(this, control);
	var commands_lights = { // I don't have any lights, so I've not tested this.
		"ON" : 100,
		"OFF" : 0,
		"HALF" : 50
	}
	var commands_shade = {
		"CLOSE" : 0, 
		"OPEN" : 100,
		"HALF" : 50
	}
	var commands_pico_remote = {
		"CLOSE" : 4,
		"HALF" : 3,
		"OPEN" : 2
	}
        var configNode = RED.nodes.getNode(control.confignode);
        this.devName = control.name;
        this.devId = configNode.deviceMap[this.devName];
        this.myType = configNode.deviceType[this.devName];

	if ( this.myType === "Pico Remote" ) {
		var command_tbl = commands_pico_remote;
	} else if ( this.myType === "Shade" ) {
		var command_tbl = commands_shade;
	} else if ( this.myType === "Light" ) {
		var command_tbl = commands_lights;
	} else {
		console.log("Unrecognized device_type '"+ this.myType +"'");
	}

	if ( Valid_Types.device_types[this.myType] !== undefined ) {
		this.type = Valid_Types.device_types[this.myType].type;
	} else { // otherwise, we'll default to OUTPUT, even though we'll eventually only allow them to select from valid types
		console.log("LutronControlNode: this.myType='"+ this.myType +"' is not a valid type! Defaulting to OUTPUT");
		this.type = "OUTPUT";
	}
        this.on('input', function (msg) {
            // data is msg.payload
            if (!isNaN(msg.payload)) {
                configNode.sendLutronCommand(this.devId, msg.payload, this.type); // no topic or not device. treat as OUTPUT
	    } else if ( typeof msg.payload === "string" && command_tbl[ msg.payload ] !== undefined ) {
			configNode.sendLutronCommand( this.devId, command_tbl[ msg.payload ], this.type );
            } else {
		console.log( "unknown payload type payload='"+ msg.payload +"', or unsupported type="+ typeof msg.payload );
             //   console.log('Error could not converted input value to number val=' + msg.paylaod);
            }
        })
    }
    RED.nodes.registerType('lutron-control', LutronControlNode);
}
