import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host {
        --background: var(--background-theme-1);
        --color: var(--font-color-theme-1);
        background: var(--background);
        box-shadow: 0 0 3px 0 var(--background-theme-2) inset;
    }

    .location {
        color: var(--color);
        font-size: 0.95em;
        margin: 0;
    }
    
    .location span:last-child {
        font-weight: 300;
        font-style: italic;
        text-align: right;
    }
`;
