import {css} from 'lit-element';

// language=CSS
export const style = css`
    citykleta-search-box,
    citykleta-location {
        background: var(--background-theme);
    }
    
    citykleta-search-box{
        max-height: 16em;
    }

    citykleta-location {
        padding: 0 1em;
    }
    
    :host > *:not(:first-child){
        margin-top: 1em;
    }
`;
