export const truncate = (value: number): number => Math.trunc(value * 10 ** 6) / 10 ** 6;

export const unique = <T>(iterable: Iterable<T>): Iterable<T> => {
    const uniques = [];

    for (const i of iterable) {
        if (!uniques.includes(i)) {
            uniques.push(i);
        }
    }

    return uniques;
};
