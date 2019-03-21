import {html, css, LitElement} from 'lit-element';
import {classMap} from 'lit-html/directives/class-map';
import {GeoLocation} from '../util';
import {debounce} from '../util';
import {loadingIndicator} from './icons';
import {ServiceRegistry} from '../services/service-registry';
import {suggester} from '../services/search';

export const propDef = {
    isBusy: {
        type: Boolean
    },
    suggestions: {
        type: Array
    },
    selectedSuggestion: {
        type: Object
    }
};

export interface SuggestionFunction {
    (query: string): Promise<GeoLocation[]> | GeoLocation[];
}

export class SearchBox extends LitElement {

    static get properties() {
        return propDef;
    }

    private readonly suggester: SuggestionFunction;

    private isBusy = false;
    private suggestions: GeoLocation[] = [];
    private selectedSuggestion: GeoLocation = null;

    private reset() {
        this.suggestions = [];
        this.selectedSuggestion = null;
    }

    private handleKeyDown(ev) {
        const {key} = ev;
        switch (key) {
            case 'ArrowDown':
            case 'ArrowUp': {
                ev.preventDefault();
                if (this.suggestions.length) {
                    const index = this.suggestions.indexOf(this.selectedSuggestion);
                    let actualIndex = index;
                    if (key === 'ArrowDown') {
                        actualIndex = index + 1 >= this.suggestions.length ? 0 : index + 1;
                    } else {
                        actualIndex = index - 1 >= 0 ? index - 1 : this.suggestions.length - 1;
                    }
                    this.selectSuggestion(this.suggestions[actualIndex]);
                }
                break;
            }
            case 'Escape': {
                this.selectSuggestion(null);
                break;
            }
            case 'Enter': {
                this.reset();
            }
        }

    }

    constructor(registry: ServiceRegistry) {
        super();
        this.suggester = suggester(registry);
        // this.addEventListener('blur', this.reset);
        this.addEventListener('keydown', this.handleKeyDown)
    }

    async suggest(query: string) {
        try {
            this.isBusy = true;
            this.suggestions = await this.suggester(query);
            this.selectedSuggestion = null;
        } catch (e) {
            this.suggestions = [];
        } finally {
            this.isBusy = false;
        }

    }

    selectSuggestion(suggestion: GeoLocation) {
        this.selectedSuggestion = suggestion;
        const event = new CustomEvent('selection-change', {
            detail: {
                suggestion: this.selectedSuggestion
            }
        });
        this.dispatchEvent(event);
        this.focus();
    }

    focus() {
        this.shadowRoot.querySelector('input').focus();
    }

    render() {
        const{suggestions} = this;
        const onInput = debounce(() => {this.suggest(this.shadowRoot.querySelector('input').value);});
        const suggestionElements = suggestions.map((val, index) => html`<li @click="${() => {this.selectSuggestion(val);}}" role="option" aria-selected="${val === this.selectedSuggestion}" id="${`suggestion-${index}`}"><citykleta-location-suggestion .suggestion="${val}"></citykleta-location-suggestion></li>`);
        return html`
<link rel="stylesheet" href="search-box.css">
<div aria-owns="place-suggestions-box" role="combobox" aria-expanded="${suggestions.length > 0}" aria-haspopup="listbox">
    <div id="loading-indicator" class="${classMap({hidden: !this.isBusy})}" aria-hidden="true">
        ${loadingIndicator()}
    </div>
    <input @input="${onInput}" aria-controls="place-suggestions-box" placeholder="ex: teatro karl Marx">
    <button></button>
</div>
<ol role="listbox" id="place-suggestions-box">${suggestionElements}</ol>
`;
    }
}
