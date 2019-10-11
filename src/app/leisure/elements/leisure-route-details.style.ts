// language=CSS
import {css} from 'lit-element';

export const style = css`
    :host {
        --adorner-color: var(--color-theme);
        counter-reset: stop;
    }

    citykleta-listbox-option::before {
        color: var(--adorner-color);
    }

    citykleta-listbox-option[aria-selected=true] {
        --adorner-color: var(--font-color-theme-2);
    }


    h2, h3 {
        margin: 0;
    }

    h2 {
        font-size: 1.2rem;
        margin: 1.2em 0.5em;
        border-bottom: 2px solid var(--color-theme);
    }

    h3 {
        font-size: 1.1rem;
    }

    p {
        margin: 0.5em 0;
    }
`;