import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host {
        background: var(--background-theme);
        --route-bg-color: inherit;
        --route-color: inherit;
        --route-border-color: var(--background-theme-1);
    }


    dl {
        display: grid;
        grid-template-columns: repeat(2, fit-content(100px));
        grid-row-gap: 0.25em;
    }

    dt {
        font-weight: bold;
    }

    dt::after {
        content: ':'
    }

    .unit {
        margin: 0 0.25em;
        font-style: italic;
        font-size: 0.9em;
    }
`;
