import {html, LitElement} from 'lit-element';
import {SearchResult} from '../../utils';
import {classMap} from 'lit-html/directives/class-map';
import {style} from './search-panel.style';

export const template = ({selectedSearchResult}) => {
    return html`
    <citykleta-search-box></citykleta-search-box>
    <citykleta-location .location="${selectedSearchResult}" class="${classMap({hidden: selectedSearchResult === null})}"></citykleta-location>
`;
};

export const propDef = {
    selectedSearchResult: {type: Object}
};

export class SearchPanel extends LitElement {

    private selectedSearchResult: SearchResult = null;

    constructor() {
        super();
    }

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    render() {
        return template({
            selectedSearchResult: this.selectedSearchResult
        });
    }
}

