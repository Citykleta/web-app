import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host {
        --background-color: var(--background-theme, white);
        --border-color: var(--background-theme-3);
        --color: var(--font-color-theme, black);
        color: var(--color);
        display: inline-block;
        margin: 1em;
        min-width: 400px;
    }

    .panel {
        background: var(--background-color);
        border-bottom: 2px solid var(--border-color);
        display: flex;
        flex-direction: column;
    }`;
