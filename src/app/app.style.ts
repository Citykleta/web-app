import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host {
        --background: var(--background-theme-1);
        color: var(--font-color-theme);
        padding: 0.6em;
        max-height: 100vh;
    }

    citykleta-tab {
        font-weight: lighter;
        font-size: 0.95rem;
        background: var(--background);
        border-color: var(--background-theme-3, currentColor);
        border-style: solid;
        border-width: 2px 1px 0 0;
        box-shadow: 0 0 2px 0 var(--background-theme-2) inset;
        cursor: pointer;
        outline: none;
        padding: 0.6em 2em;
        transition: margin 0.3s;
    }

    citykleta-tab:focus, citykleta-tab:hover {
        text-decoration: underline;
    }

    citykleta-tab:last-child {
        border-right-width: 0;
    }

    citykleta-tab[aria-selected=true] {
        --background: var(--background-theme);
        border-top-color: var(--color-theme-1);
        box-shadow: none;
        font-weight: normal;
        margin-top: -0.2rem;
    }
`;
