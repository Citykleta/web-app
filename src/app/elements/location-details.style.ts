import {css} from 'lit-element';

// language=CSS
export const style = css`
:host {
    --background: var(--background-theme-1);
    --color:var(--font-color-theme-1);
    background: var(--background);
    box-shadow: 0 0 3px 0 var(--background-theme-2) inset;
}

dl {
    color:var(--color);
    display: grid;
    font-size: 0.95em;
    grid: repeat(2, 1fr) / repeat(2, 1fr);
    grid-row-gap: 0.25em;
    margin: 0;
}

dd {
    font-weight: 300;
    font-style: italic;
    text-align: right;
}

dt::after {
    content: ':';
}
`;
