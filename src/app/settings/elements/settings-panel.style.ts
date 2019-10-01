import {css} from 'lit-element';

// language=CSS
export const style = css`:host {
    background: var(--background-theme);
}

:host > * {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12),
    0 4px 4px rgba(0, 0, 0, 0.12),
    0 6px 4px rgba(0, 0, 0, 0.12);
    padding: 1em;
}

label {
    display: flex;
    justify-content: space-between;
}

label > span:first-child::after {
    content: ':';
}`;
