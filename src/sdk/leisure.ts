import {LeisureRoute} from '../app/leisure/reducer';

export interface Leisure {
    searchRoutes(): Promise<LeisureRoute[]>
}

const DEFAULT_ENDPOINT_ROOT = 'https://api.citykleta-test.com';

export const factory = ({endpoint = DEFAULT_ENDPOINT_ROOT} = {endpoint: DEFAULT_ENDPOINT_ROOT}): Leisure => {

    let leisureController = null;

    return {
        async searchRoutes() {

            if (leisureController) {
                leisureController.abort();
            }

            leisureController = new AbortController();

            try {
                const url = new URL(`/leisure`, endpoint);
                const res = await fetch(url.toString(), {
                    signal: leisureController.signal
                });

                if (res.ok !== true) {
                    throw new Error('not ok response');
                }

                return res.json();
            } finally {
                leisureController = null;
            }
        }
    };
};