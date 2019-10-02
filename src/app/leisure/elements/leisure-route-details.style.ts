// language=CSS
import {css} from 'lit-element';

export const style = css`
    :host {
        --route-bg-color: inherit;
        --route-color: inherit;
        --route-border-color: var(--background-theme-1);
        --adorner-color: var(--color-theme);
        counter-reset: stop;
    }

    ol {
        margin: 0;
        padding: 0;
        width: 100%;
        list-style: none;
    }

    li::before {
        color: var(--adorner-color);
        content: counter(stop);
        font-size: 1.2em;
        font-style: italic;
        font-weight: bold;
        text-shadow: 0 1px 1px rgb(100, 100, 100);
        padding: 0.5em;

    }

    li {
        display: flex;
        align-items: center;
        counter-increment: stop;
        padding: 0.5em;
        background: var(--route-bg-color);
        color: var(--route-color);
        transition: background-color 0.3s, color 0.3s;
    }

    li[aria-selected=true] {
        --route-bg-color: var(--color-theme-1);
        --route-color: var(--font-color-theme-2);
        --adorner-color: var(--font-color-theme-2);
    }

    li:not(:last-child) {
        border-bottom: 1px solid var(--route-border-color);
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