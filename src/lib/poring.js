const poring = (() => {

    // #region Signals

    const signalContext = {
        params: null,
        createdSignals: null,
        createdEffects: null,
        accessedSignals: null
    };

    class Signal {
        constructor(initialValue) {
            this.value = initialValue == null ? null : initialValue;
            this.listeners = [];
            if (signalContext.createdSignals != null) {
                signalContext.createdSignals.push(this);
            }
        }

        get() {
            if (signalContext.accessedSignals != null && signalContext.accessedSignals.indexOf(this) === -1) {
                signalContext.accessedSignals.push(this);
            }
            return this.value;
        }

        set(_arg) {
            const newValue = typeof _arg === "function"
                ? _arg(this.value)
                : _arg;
            if (this.value !== newValue) {
                this.value = newValue;
                const listeners = [...this.listeners];
                for (const listener of listeners) {
                    listener();
                }
            }
        }

        listen(cb) {
            if (this.listeners.indexOf(cb) === -1) {
                this.listeners.push(cb);
            }
        }

        unlisten(cb) {
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
        const accessedSignals = [];

        function execute() {
            for (const signal of accessedSignals) {
                signal.unlisten(execute);
            }

            const oldAccessedSignals = signalContext.accessedSignals;
            signalContext.accessedSignals = [];
            cb();
            for (const signal of signalContext.accessedSignals) {
                signal.listen(execute);
            }
            accessedSignals.splice(0, accessedSignals.length);
            accessedSignals.push(...signalContext.accessedSignals);
            signalContext.accessedSignals = oldAccessedSignals;
        }

        function dispose() {
            for (const signal of accessedSignals) {
                signal.unlisten(execute);
            }
        }

        if (signalContext.createdEffects != null) {
            signalContext.createdEffects.push({dispose});
        }

        execute();

        return dispose
    }

    function compute(cb) {
        let result = signal()
        effect(() => {
            result.set(cb())
        })
        return result;
    }

    // #endregion

    // #region Rendering

    const EVENT_LISTENER_ATTRIBUTES = ["onclick", "onchange", "oninput"];

    function h(tag, _props, _children) {
        const props = _props || {};
        const children = normalizeChildren(_children);

        const el = document.createElement(tag);

        for (const key in props) {
            if (EVENT_LISTENER_ATTRIBUTES.indexOf(key) >= 0) {
                el[key] = props[key];
            } else if (tag === 'input' && props.type === 'checkbox' && key === 'checked') {
                props[key] && el.setAttribute(key, '');
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
                if (oldNodeType === 'input' && oldNode.getAttribute('type') === 'checkbox') {
                    oldNode.checked = oldNode.hasAttribute('checked');
                }
            }

            if (oldNode instanceof PoringElement) {
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

    class PoringElement extends HTMLElement { }

    // #endregion

    // #region Components

    function component(tag, attributes, logic) {
        class Component extends PoringElement {
            static observedAttributes = attributes;
            constructor() {
                super();
                this.attributeSignals = null;
                this.signals = null;
                this.effects = null;
            }

            build() {
                const oldParams = signalContext.params;
                const oldCreatedSignals = signalContext.createdSignals;
                const oldCreatedEffects = signalContext.createdEffects;
                signalContext.params = { component: this };
                signalContext.createdSignals = [];
                signalContext.createdEffects = [];

                this.attributeSignals = Object.fromEntries(attributes.map(attr => [attr, signal(this.getAttribute(attr))]));
                logic(this.attributeSignals, this);

                this.signals = signalContext.createdSignals;
                this.effects = signalContext.createdEffects;
                signalContext.params = oldParams;
                signalContext.createdSignals = oldCreatedSignals;
                signalContext.createdEffects = oldCreatedEffects;
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

    function renderer(cb) {
        const component = signalContext.params.component;
        effect(() => {
            patchDom(component, cb())
        })
    }

    // #endregion    

    return { signal, effect, compute, component, h, renderer, patchDom }
})();
