import {css} from 'lit-element';

// language=CSS
export const style = css`:host {
    background: var(--background-theme);
    padding: 1em;
}

label {
    display: flex;
    justify-content: space-between;
}

label > span:first-child::after {
    content: ':';
}`;
