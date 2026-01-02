/**
 * Node-RED Davis - Update Node
 * Updates existing UI elements dynamically
 */
'use strict';

module.exports = function (RED) {

    function DavisUpdate(config) {
        RED.nodes.createNode(this, config);

        const node = this;

        // Node configuration
        node.mode = config.mode || 'update';
        node.selector = config.selector || '';
        node.attribute = config.attribute || 'innerHTML';

        node.on('input', function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments); };

            // Build update configuration
            const update = {
                _davis: {
                    method: node.mode,
                    components: [{
                        selector: node.selector || msg.selector,
                        attribute: node.attribute || msg.attribute || 'innerHTML',
                        value: msg.payload,
                        attributes: msg.attributes || {},
                        styles: msg.styles || {}
                    }]
                }
            };

            // Merge with incoming message
            const outMsg = { ...msg, ...update };

            send(outMsg);
            node.status({ fill: 'green', shape: 'dot', text: `${node.mode}: ${node.selector || msg.selector}` });

            if (done) done();
        });
    }

    RED.nodes.registerType('davis-update', DavisUpdate);
};
