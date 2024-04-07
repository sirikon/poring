const poring = (() => {

    // #region Signals

    const scopeContext = {
        active: false,
        params: null,
        createdSignals: null,
        createdEffects: null,
    };

    const trackingContext = {
        accessedSignals: null
    }

    class Signal {
        constructor(initialValue) {
            this.value = initialValue == null ? null : initialValue;
            this.listeners = [];
            if (scopeContext.active) {
                scopeContext.createdSignals.push(this);
            }
        }

        get() {
            if (trackingContext.accessedSignals != null && trackingContext.accessedSignals.indexOf(this) === -1) {
                trackingContext.accessedSignals.push(this);
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

    function track(cb) {
        const oldAccessedSignals = trackingContext.accessedSignals;
    
        trackingContext.accessedSignals = [];
    
        cb();
        const accessedSignals = trackingContext.accessedSignals;
    
        trackingContext.accessedSignals = oldAccessedSignals;
    
        return accessedSignals;
    }

    function effect(cb) {
        const currentAccessedSignals = [];

        function execute() {
            const newAccessedSignals = track(cb);

            for(let i = currentAccessedSignals.length - 1; i >= 0; i--) {
                const signal = currentAccessedSignals[i];
                if (newAccessedSignals.indexOf(signal) === -1) {
                    signal.unlisten(execute);
                    currentAccessedSignals.splice(i, 1);
                }
            }

            for (const signal of newAccessedSignals) {
                if (currentAccessedSignals.indexOf(signal) === -1) {
                    signal.listen(execute);
                    currentAccessedSignals.push(signal);
                }
            }
        }

        function dispose() {
            for (const signal of currentAccessedSignals) {
                signal.unlisten(execute);
            }
        }

        if (scopeContext.active) {
            scopeContext.createdEffects.push({dispose});
        }

        execute();

        return { dispose }
    }

    function compute(cb) {
        let s = signal()
        const e = effect(() => {
            s.set(cb())
        })
        return {
            get: () => s.get(),
            dispose: () => {
                e.dispose();
                s.dispose();
            }
        };
    }

    function scope(params, cb) {
        const oldActive = scopeContext.active;
        const oldParams = scopeContext.params;
        const oldCreatedSignals = scopeContext.createdSignals;
        const oldCreatedEffects = scopeContext.createdEffects;

        scopeContext.active = true;
        scopeContext.params = params;
        scopeContext.createdSignals = [];
        scopeContext.createdEffects = [];

        cb();
        const signals = scopeContext.createdSignals;
        const effects = scopeContext.createdEffects;

        scopeContext.active = oldActive;
        scopeContext.params = oldParams;
        scopeContext.createdSignals = oldCreatedSignals;
        scopeContext.createdEffects = oldCreatedEffects;

        function dispose() {
            for(const effect of effects) {
                effect.dispose();
            }
            for(const signal of signals) {
                signal.dispose();
            }
        }

        return { dispose };
    }

    // #endregion

    // #region Rendering

    const EVENT_LISTENER_ATTRIBUTES = ["onclick", "onchange", "oninput"];

    const ELEMENT_ODDITIES = {
        'input': {
            onBuild: (el, props) => {
                if (props.type === 'checkbox') {
                    props.checked
                        ? el.setAttribute('checked', '')
                        : el.removeAttribute('checked');
                    el.checked = !!props.checked;
                }
            },
            onPatch: (oldEl, newEl) => {
                const type = oldEl.getAttribute('type');
                if (type === 'text') {
                    if (oldEl.value !== newEl.value) {
                        oldEl.value = newEl.value;
                    }
                }
                if (type === 'checkbox') {
                    oldEl.checked = newEl.checked;
                }
            }
        }
    }

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
        ELEMENT_ODDITIES[tag]?.onBuild(el, props);

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

            ELEMENT_ODDITIES[newNodeType]?.onPatch(oldNode, newNode);

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
                this.scope = null;
            }

            build() {
                this.scope = scope({ component: this }, () => {
                    this.attributeSignals = Object.fromEntries(attributes.map(attr => [attr, signal(this.getAttribute(attr))]));
                    logic(this.attributeSignals, this);
                })
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (this.attributeSignals == null) return;
                this.attributeSignals[name].set(newValue);
            }

            connectedCallback() {
                this.build();
            }

            disconnectedCallback() {
                this.scope.dispose();
            }
        }
        customElements.define(tag, Component);
    }

    function renderer(cb) {
        const component = scopeContext.params.component;
        effect(() => {
            patchDom(component, cb())
        })
    }

    // #endregion    

    return { signal, effect, compute, component, h, renderer, patchDom }
})();
