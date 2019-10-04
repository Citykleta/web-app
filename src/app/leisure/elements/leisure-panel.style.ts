import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host {
        --route-bg-color: inherit;
        --route-color: inherit;
        --route-border-color: var(--background-theme-1);
    }

    :host > * {
        background: var(--background-theme);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12),
        0 4px 4px rgba(0, 0, 0, 0.12),
        0 6px 4px rgba(0, 0, 0, 0.12);
    }

    citykleta-listbox {
        list-style: none;
        margin: 0;
        padding: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    citykleta-listbox-option {
        padding: 0.5em 1em;
        background: var(--route-bg-color);
        color: var(--route-color);
        transition: background-color 0.3s, color 0.3s;
    }

    citykleta-listbox-option[aria-selected=true] {
        --route-bg-color: var(--color-theme-1);
        --route-color: var(--font-color-theme-2);
    }

    citykleta-listbox-option:not(:last-child) {
        border-bottom: 1px solid var(--route-border-color);
    }

    h2 {
        font-size: 1.2rem;
        margin: 0;
    }

    p {
        margin: 0.25em 0;
    }

    :host > citykleta-leisure-route-details {
        margin-top: 1em;
    }
`;