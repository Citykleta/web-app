import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host > div {
        background: var(--background-theme);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12),
        0 4px 4px rgba(0, 0, 0, 0.12),
        0 6px 4px rgba(0, 0, 0, 0.12);
    }

    ol {
        flex-grow: 1;
        list-style: none;
        margin: 0;
        padding: 0;
    }

    #action-buttons-container {
        display: flex;
        justify-content: center;
        padding: 0.5em;
    }

    #action-buttons-container > * {
        margin: 0 0.4em;
    }

    #stops-list-container {
        align-items: center;
        display: flex;
    }

    #swap-button {
        transform: rotateZ(90deg);
        margin: 0 0.5em;
    }

    li {
        --border-width: 14px;
        --offset: calc(-1 * var(--border-width));
        position: relative;
    }

    li.drop-target-before::before,
    li.drop-target-after::after {
        content: '';
        display: inline-block;
        border-width: var(--border-width);
        border-style: solid;
        border-color: transparent transparent transparent var(--color-theme-compl);
        z-index: 99;
        position: absolute;
    }

    li.drop-target-before::before {
        top: var(--offset);
    }

    li.drop-target-after::after {
        bottom: var(--offset);
    }

    .hidden {
        display: none;
    }

    #routes-container {
        margin-top: 1em;
        padding-bottom: 1em;
    }

    h2 {
        border-bottom: 2px solid var(--color-theme);
        font-size:1.2rem;
        margin:1em;
    }
`;
