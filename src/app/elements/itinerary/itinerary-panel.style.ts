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
    }

    #stops-list-container {
        align-items: center;
        display: flex;
    }

    #swap-button {
        transform: rotateZ(90deg);
    }

    li {
        --border-length: 2px;
        --padding-length: 0.2rem;
        --border-color: transparent;
        border-color: var(--border-color);
        border-style: solid;
        border-width: var(--border-length) 0 var(--border-length) 0;
        padding: var(--padding-length) calc(var(--padding-length) / 2);
        position: relative;
    }


    li.drop-target-before::before {
        content: '';
        display: inline-block;
        border-width: var(--padding-length);
        border-style: solid;
        border-color: transparent transparent transparent var(--border-color);
        z-index: 99;
        position: absolute;
        top: calc(-1 * (var(--padding-length) + var(--border-length)));
        left: calc(-1 / 2 * var(--padding-length));
    }

    li.drop-target-after::after {
        content: '';
        display: inline-block;
        border-width: var(--padding-length);
        border-style: solid;
        border-color: transparent transparent transparent var(--border-color);
        z-index: 99;
        position: absolute;
        bottom: calc(-1 * (var(--padding-length) + var(--border-length)));
        left: calc(-1 / 2 * var(--padding-length));
    }

    li.drop-target-after,
    li.drop-target-before {
        --border-color: var(--color-theme-compl)
    }

    .hidden {
        display: none;
    }
`;
