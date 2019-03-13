import {Component} from './types';
import {debounce, UIPoint} from '../util';

//todo
const loadingIndicator = `<svg version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 40 40" enable-background="new 0 0 40 40" xml:space="preserve">
  <path opacity="0.2" d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946
    s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634
    c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"></path>
  <path d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0
    C22.32,8.481,24.301,9.057,26.013,10.047z">
    <animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.5s" repeatCount="indefinite"></animateTransform>
    </path>
  </svg>`;

const template = `<div aria-owns="place-suggestions-box" role="combobox" aria-expanded="false" aria-haspopup="listbox">
<div class="loading-indicator hidden" aria-hidden="true">
${loadingIndicator}
</div>
<input aria-controls="place-suggestions-box" type="search">
</div>
<ul role="listbox" id="place-suggestions-box"></ul>`;

interface Suggest<T> {
    (query: string): Promise<T[]>;
}

interface SearchBoxController<T> {
    suggestions: T[];
    selectedSuggestion: T;
    busy: boolean;
    readonly suggester: Suggest<T>;

    suggest(query: string): Promise<T[]>;

    selectSuggestion(suggestion: T): void;

    selectPreviousSuggestion(): void;

    selectNextSuggestion(): void;
}

const SearchBoxControllerPrototype = {
    async suggest(query: string) {
        try {
            this.isBusy = true;
            this.suggestions = await this.suggester(query);
            if (this.suggestions.length) {
                this.selectSuggestion(this.suggestions[0]);
            } else {
                this.selectedSuggestion = null;
            }
        } catch (e) {
            this.suggestions = [];
        } finally {
            this.isBusy = false;
        }
        return this.suggestions;
    },
    selectSuggestion(suggestion) {
        if (this.suggestions.includes(suggestion)) {
            this.selectedSuggestion = suggestion;
        }
    },
    selectPreviousSuggestion() {
        if (this.selectedSuggestion) {
            const index = this.suggestions.indexOf(this.selectedSuggestion) - 1;
            const actualIndex = index >= 0 ? index : this.suggestions.length - 1;
            return this.selectSuggestion(this.suggestions[actualIndex]);
        }
    },
    selectNextSuggestion() {
        if (this.selectedSuggestion) {
            const index = this.suggestions.indexOf(this.selectedSuggestion) + 1;
            const actualIndex = index >= this.suggestions.length ? 0 : index;
            return this.selectSuggestion(this.suggestions[actualIndex]);
        }
    }
};

export const searchBoxController = <T>(suggest: Suggest<T>, renderer): SearchBoxController<T> => {
    let isBusy = false;
    let suggestions = [];
    let selectedSuggestion = null;

    const render = () => renderer({
        isBusy,
        suggestions,
        selectedSuggestion
    });

    return Object.create(SearchBoxControllerPrototype, {
        suggester: {
            value: suggest
        },
        isBusy: {
            get() {
                return isBusy;
            },
            set(value: boolean) {
                if (value !== isBusy) {
                    isBusy = value;
                    render();
                }
            }
        },
        suggestions: {
            get() {
                return suggestions;
            },
            set(value: T[]) {
                suggestions = value;
                render();
            }
        },
        selectedSuggestion: {
            get() {
                return selectedSuggestion;
            },
            set(value: T) {
                if (value !== selectedSuggestion) {
                    selectedSuggestion = value;
                    render();
                }
            }
        }
    });
};

const createOption = (val: UIPoint, idx: number) => {
    const item = document.createElement('LI');
    item.setAttribute('role', 'option');
    item.setAttribute('id', `search-result-${idx}`);
    item.textContent = val.name || (val.address && val.address.street) || 'Unknown place';
    return item;
};

export const factory = (suggest: Suggest<UIPoint>): Component => {
    const container = document.createElement('div');
    container.classList.add('search-box');
    container.innerHTML = template;

    const comboBox = container.querySelector('[role=combobox]');
    const input = container.querySelector('input');
    const loadingIndicator = container.querySelector('.loading-indicator');
    const suggestionsList = container.querySelector('ul');

    let suggestionsElements = [];
    let suggestions = [];

    const renderer = ({suggestions: newSuggestions, isBusy, selectedSuggestion}) => {
        loadingIndicator.classList.toggle('hidden', isBusy === false);
        if (suggestions.length !== newSuggestions.length || newSuggestions.some((s, i) => s !== suggestions[i])) {
            const range = document.createRange();
            range.selectNodeContents(suggestionsList);
            range.deleteContents();
            suggestions = newSuggestions;
            suggestionsElements = suggestions.map(createOption);
            for (const s of suggestionsElements) {
                suggestionsList.appendChild(s);
            }
            comboBox.setAttribute('aria-expanded', 'true');
        }

        const index = suggestions.indexOf(selectedSuggestion);

        suggestionsElements.forEach((el, i) => {
            el.setAttribute('aria-selected', i === index);
        });

        input.setAttribute('aria-activedescendant', index >= 0 ? suggestionsElements[index].getAttribute('id') : '');
    };

    const controller = searchBoxController<UIPoint>(suggest, renderer);

    input.addEventListener('keydown', ev => {
        const {key} = ev;
        switch (key) {
            case 'ArrowDown':
            case 'ArrowUp': {
                ev.preventDefault();
                if (key === 'ArrowDown') {
                    controller.selectPreviousSuggestion();
                } else {
                    controller.selectNextSuggestion();
                }
                break;
            }
            case 'Enter': {
                input.value = controller.selectedSuggestion.name;
                controller.suggestions = [];
            }
        }
    });

    const handleInput = debounce(ev => {
        const {target} = ev;
        const {value} = target;
        return controller.suggest(value);
    });

    input.addEventListener('input', handleInput);

    return {
        clean() {
        },
        dom() {
            return container;
        }
    };
};
