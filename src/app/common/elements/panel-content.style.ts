import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host > * {
        background: var(--background-theme);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12),
        0 4px 4px rgba(0, 0, 0, 0.12),
        0 6px 4px rgba(0, 0, 0, 0.12);
    }

    h2, h3 {
        margin: 0;
    }

    h2 {
        font-size: 1.2rem;
        margin: 1em 0.5em;
        border-bottom: 2px solid var(--color-theme);
    }

    p {
        margin: 0.25em 0;
    }

    :host > *:not(:first-child) {
        margin-top: 1em;
    }`;
