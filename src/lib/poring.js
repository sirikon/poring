const poring = (() => {
    const EVENT_LISTENER_ATTRIBUTES = ["onclick", "onchange", "oninput"];

    function h(tag, _props, _children) {
        const props = _props || {};
        const children = normalizeChildren(_children);

        const el = document.createElement(tag);

        for (const key in props) {
            if (EVENT_LISTENER_ATTRIBUTES.indexOf(key) >= 0) {
                el[key] = props[key];
            } else {
                el.setAttribute(key, props[key]);
            }
        }

        for (const _child of children) {
            if (_child == null || typeof _child === "boolean") {
                continue
            }

            const child = ['string', 'number'].includes(typeof _child)
                ? document.createTextNode(_child.toString())
                : _child;
            el.appendChild(child);
        }

        return el;
    }

    function normalizeChildren(children) {
        if (Array.isArray(children)) {
            return children;
        }
        if (children != null) {
            return [children];
        }
        return [];
    }

    const context = {
        params: null,
        createdSignals: null,
        createdEffects: null,
        accessedSignals: null
    };

    class Signal {
        constructor(initialValue) {
            this.value = initialValue;
            this.listeners = [];
            if (context.createdSignals != null) {
                context.createdSignals.push(this);
            }
        }

        get() {
            if (context.accessedSignals != null && context.accessedSignals.indexOf(this) === -1) {
                context.accessedSignals.push(this);
            }
            return this.value;
        }

        set(_arg) {
            const newValue = typeof _arg === "function"
                ? _arg(this.value)
                : _arg;
            this.value = newValue;
            console.log(this.listeners);
            for (const listener of this.listeners) {
                console.log(listener);
                listener();
            }
        }

        listen(cb) {
            console.log('Listening', cb);
            if (this.listeners.indexOf(cb) === -1) {
                this.listeners.push(cb);
            }
        }

        unlisten(cb) {
            console.log('Unlistening', cb);
            const pos = this.listeners.indexOf(cb);
            if (pos >= 0) {
                this.listeners.splice(pos, 1);
            }
        }

        dispose() {
            this.listeners.splice(0, this.listeners.length);
        }
    }
    function signal(initialValue) { return new Signal(initialValue); }

    function effect(cb) {
        let accessedSignals = [];

        function execute() {
            const oldAccessedSignals = context.accessedSignals;
            context.accessedSignals = [];
            cb();
            for (const signal of accessedSignals) {
                signal.unlisten(execute);
            }
            for (const signal of context.accessedSignals) {
                signal.listen(execute);
            }
            accessedSignals = context.accessedSignals;
            context.accessedSignals = oldAccessedSignals;
        }

        function dispose() {
            for (const signal of accessedSignals) {
                signal.unlisten(execute);
            }
        }

        if (context.createdEffects != null) {
            context.createdEffects.push({dispose});
        }

        execute();

        return dispose
    }

    class PoringComponent extends HTMLElement { }

    function component(tag, attributes, logic) {
        class Component extends PoringComponent {
            static observedAttributes = attributes;
            constructor() {
                super();
                this.attributeSignals = null;
                this.signals = null;
                this.effects = null;
            }

            build() {
                const oldParams = context.params;
                const oldCreatedSignals = context.createdSignals;
                const oldCreatedEffects = context.createdEffects;
                context.params = { component: this };
                context.createdSignals = [];
                context.createdEffects = [];

                this.attributeSignals = Object.fromEntries(attributes.map(attr => [attr, signal(this.getAttribute(attr))]));
                logic(this.attributeSignals, this);

                this.signals = context.createdSignals;
                this.effects = context.createdEffects;
                context.params = oldParams;
                context.createdSignals = oldCreatedSignals;
                context.createdEffects = oldCreatedEffects;
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (this.attributeSignals == null) return;
                this.attributeSignals[name].set(newValue);
            }

            connectedCallback() {
                this.build();
            }

            disconnectedCallback() {
                for(const signal of this.signals) {
                    signal.dispose();
                }
                for(const effect of this.effects) {
                    effect.dispose();
                }
            }
        }
        customElements.define(tag, Component);
    }

    function patchDom(root, content) {
        if (content == null || (Array.isArray(content) && content.length === 0)) {
            root.innerHTML = '';
            return;
        }

        const oldNodes = [...root.childNodes];
        const newNodes = (Array.isArray(content) ? content : [content])
            .filter(n => n != null && typeof n !== "boolean");

        const leftOverElements = oldNodes.length - newNodes.length;
        for (let i = leftOverElements; i > 0; i--) {
            const el = oldNodes[oldNodes.length - i];
            el.parentNode.removeChild(el);
        }

        for (const i in newNodes) {
            const newNode = newNodes[i];
            const oldNode = oldNodes[i];

            if (!oldNode) {
                root.appendChild(newNode);
                continue;
            }

            const newNodeType = getNodeType(newNode);
            const oldNodeType = getNodeType(oldNode);
            if (newNodeType !== oldNodeType) {
                oldNode.parentNode.replaceChild(newNode, oldNode);
                continue;
            }

            if (!["text", "comment"].includes(newNodeType)) {
                const newNodeAttributeNames = newNode.getAttributeNames();
                const oldNodeAttributeNames = oldNode.getAttributeNames();
                for (const attr of oldNodeAttributeNames) {
                    if (!newNodeAttributeNames.includes(attr)) {
                        oldNode.removeAttribute(attr);
                    }
                }
                for (const attr of newNodeAttributeNames) {
                    oldNode.setAttribute(attr, newNode.getAttribute(attr));

                    if (attr === 'value' && newNodeType === 'input') {
                        if (oldNode.value !== newNode.value) {
                            oldNode.value = newNode.value;
                        }
                    }
                }
            }

            if (oldNode instanceof PoringComponent) {
                continue;
            }

            for (const event of EVENT_LISTENER_ATTRIBUTES) {
                oldNode[event] = newNode[event];
            }

            const newNodeContent = getNodeTextContent(newNode);
            if (newNodeContent != null && newNodeContent !== getNodeTextContent(oldNode)) {
                oldNode.textContent = newNodeContent;
            }

            if (newNode.childNodes.length === 0) {
                oldNode.innerHTML = '';
                continue;
            }

            if (oldNode.childNodes.length === 0 && newNode.childNodes.length > 0) {
                const fragment = document.createDocumentFragment();
                patchDom(fragment, [...newNode.childNodes]);
                oldNode.appendChild(fragment);
                continue;
            }

            if (newNode.childNodes.length > 0) {
                patchDom(oldNode, [...newNode.childNodes]);
            }
        }

    }

    function getNodeType(node) {
        if (node.nodeType === 3) return 'text';
        if (node.nodeType === 8) return 'comment';
        return node.tagName.toLowerCase();
    };

    function getNodeTextContent(node) {
        if (node.childNodes && node.childNodes.length > 0) return null;
        return node.textContent;
    };

    function renderer(cb) {
        const component = context.params.component;
        effect(() => {
            console.log('Rendering!');
            patchDom(component, cb())
        })
    }

    return { signal, effect, component, h, patchDom, renderer }
})();
