import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host > * {
        background: var(--background-theme);
    }

    ol {
        flex-grow: 1;
        list-style: none;
        margin: 0;
        padding: 0;
    }

    #add-button-container {
        display: flex;
        justify-content: center;
        padding: 0.5em;
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
`;
