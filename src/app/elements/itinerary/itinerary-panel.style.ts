import {css} from 'lit-element';

// language=CSS
export const style = css`
    ol {
        list-style: none;
        padding: 0;
        margin-left: 0.5em;
        flex-grow: 1;
    }

    #add-button-container {
        padding: 0.5em;
        display: flex;
        justify-content: center;
    }

    #stops-list-container {
        align-items: center;
        display: flex;
        padding: 0.5em 0.5em 0 0.5rem;
    }

    #swap-button {
        transform: rotateZ(90deg);
    }

    li {
        --padding-length: 0.5rem;
        border-color: var(--background-theme-1);
        border-style: solid;
        border-width: 1px 0 1px 0;
        padding: var(--padding-length) calc(var(--padding-length) / 2);
        position: relative;
    }


    li.drop-target-before::before {
        content: '';
        display: inline-block;
        border-width: var(--padding-length);
        border-style: solid;
        border-color: transparent transparent transparent var(--color-theme);
        z-index: 99;
        position: absolute;
        top: calc(-1 * (var(--padding-length) + 1px));
        left: calc(-1 / 2 * var(--padding-length));
    }

    li.drop-target-after::after {
        content: '';
        display: inline-block;
        border-width: var(--padding-length);
        border-style: solid;
        border-color: transparent transparent transparent var(--color-theme);
        z-index: 99;
        position: absolute;
        bottom: calc(-1 * (var(--padding-length) + 1px));
        left: calc(-1 / 2 * var(--padding-length));
    }

    li.drop-target-after {
        border-bottom-color: var(--color-theme);
    }

    li.drop-target-before {
        border-top-color: var(--color-theme);
    }

    citykleta-location {
        border-top: 1px solid var(--background-theme-2);
        padding: 0 1em 1em 1em;
    }

    .hidden {
        display: none;
    }
`;
