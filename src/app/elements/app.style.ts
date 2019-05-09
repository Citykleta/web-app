import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host {
        --background-color: var(--background-theme, white);
        --border-color: var(--background-theme-3);
        --color: var(--font-color-theme, black);
        color: var(--color);
        padding: 0.6em;
    }

    .panel {
        background: var(--background-color);
        border-bottom: 2px solid var(--border-color);
        display: flex;
        flex-direction: column;
    }`;
