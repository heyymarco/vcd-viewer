import styles from './styles.module.scss'



export class VcdViewerVanilla {
    #cleanup : (() => void)|null
    constructor(placeholder: Element) {
        const main = this.#createMain();
        placeholder.appendChild(main);
        this.#cleanup = () => {
            main.parentElement?.removeChild?.(main);
        };
    }
    #createMain() {
        const main = document.createElement('div');
        main.classList.add(styles.main);
        main.appendChild(this.#createToolbar());
        main.appendChild(this.#createBodyOuter());
        return main;
    }
    #createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.classList.add(styles.toolbar);
        
        toolbar.appendChild(this.#createButton('zoom-out'));
        toolbar.appendChild(this.#createButton('zoom-in'));
        
        toolbar.appendChild(this.#createButton('prev-neg-edge'));
        toolbar.appendChild(this.#createButton('prev-pos-edge'));
        
        toolbar.appendChild(this.#createButton('prev-transition'));
        toolbar.appendChild(this.#createButton('next-transition'));
        
        toolbar.appendChild(this.#createButton('next-neg-edge'));
        toolbar.appendChild(this.#createButton('next-pos-edge'));
        
        toolbar.appendChild(this.#createComboInput());
        
        toolbar.appendChild(this.#createButton('prev'));
        toolbar.appendChild(this.#createButton('next'));
        
        toolbar.appendChild(this.#createButton('touch'));
        return toolbar;
    }
    #createButton(className: string, props?: { onClick?: () => void, text?: string }) {
        const {
            onClick,
            text,
        } = props ?? {};
        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add(className);
        if (onClick) button.addEventListener('click', onClick);
        if (text) button.append(text);
        return button;
    }
    #createComboInput() {
        const combo = document.createElement('div');
        combo.classList.add(styles.comboInput);
        combo.appendChild(this.#createSearchInput());
        combo.appendChild(this.#createButton('text', { text: 't=' }));
        combo.appendChild(this.#createButton('text', { text: 'hex' }));
        return combo;
    }
    #createSearchInput() {
        const input = document.createElement('input');
        input.type = 'search';
        input.placeholder = 'Search';
        return input;
    }
    #createBodyOuter() {
        const bodyOuter = document.createElement('div');
        bodyOuter.classList.add(styles.bodyOuter);
        return bodyOuter;
    }
    
    
    
    destroy() {
        this.#cleanup?.();
        this.#cleanup = null;
    }
}
