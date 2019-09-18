import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host {
        background: var(--background-theme);
        --route-bg-color: inherit;
        --route-color: inherit;
        --route-border-color: var(--background-theme-1);
    }

    ul {
        list-style: none;
        margin: 0;
        padding: 0;
        width: 100%;
    }

    li {
        padding: 0.5em 1em;
        background: var(--route-bg-color);
        color: var(--route-color);
        transition: background-color 0.3s, color 0.3s;
    }

    li[aria-selected=true] {
        --route-bg-color: var(--color-theme-1);
        --route-color: var(--font-color-theme-2);
    }

    li:not(:last-child) {
        border-bottom: 1px solid var(--route-border-color);
    }

    h2 {
        margin: 0;
    }

    p {
        margin: 0.25em 0;
    }
`;