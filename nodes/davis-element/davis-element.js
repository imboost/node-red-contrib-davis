/**
 * Node-RED Davis - Element Node
 * Creates UI elements from Node-RED messages (no-code approach)
 */
'use strict';

module.exports = function (RED) {

    function DavisElement(config) {
        RED.nodes.createNode(this, config);

        const node = this;

        // Node configuration
        node.elementType = config.elementType || 'div';
        node.elementId = config.elementId || '';
        node.parent = config.parent || 'body';
        node.position = config.position || 'last';
        node.bsClass = config.bsClass || '';

        node.on('input', function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments); };

            // Build element configuration
            const element = {
                _davis: {
                    method: 'add',
                    components: [{
                        type: node.elementType || msg.elementType || 'div',
                        id: node.elementId || msg.id || undefined,
                        parent: node.parent || msg.parent || 'body',
                        position: node.position || msg.position || 'last',
                        slot: msg.payload,
                        class: node.bsClass || msg.class || '',
                        attributes: msg.attributes || {},
                        events: msg.events || {}
                    }]
                }
            };

            // Merge with incoming message
            const outMsg = { ...msg, ...element };

            send(outMsg);
            node.status({ fill: 'green', shape: 'dot', text: `Created ${element._davis.components[0].type}` });

            if (done) done();
        });
    }

    RED.nodes.registerType('davis-element', DavisElement);
};
