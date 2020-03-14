module.exports = function (RED) {

    function LutronControlNode(control) {
        RED.nodes.createNode(this, control);
        var configNode = RED.nodes.getNode(control.confignode);
        this.devName = control.name;
        this.devId = configNode.deviceMap[this.devName];
        this.on('input', function (msg) {
            // data is msg.payload
            if (!isNaN(msg.payload)) {
                if ( typeof msg.topic === "string" && msg.topic === "DEVICE" ) { // handle device this way for now.
                    configNode.sendLutronCommand(this.devId, msg.payload, "DEVICE"); // payload will be button
		} else {
                    configNode.sendLutronCommand(this.devId, msg.payload, "OUTPUT"); // no topic or not device. treat as OUTPUT
		}
            } else {
                console.log('Error could not converted input value to number val=' + msg.paylaod);
            }
        })
    }
    RED.nodes.registerType('lutron-control', LutronControlNode);
}
