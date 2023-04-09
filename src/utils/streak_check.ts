/**
 * Checks if the 1st date is at least 1 date apart (not 24 hours,
 * but the date had to have increased) from the 2nd one.
 * @param date1 1st date
 * @param date2 2nd date
 * @returns true if 1st date is at least one date apart, false if it isn't
 */
export function isNextDayOrGreater(date1: Date, date2: Date): boolean {
    if(date1.getFullYear()>date2.getFullYear()){
        return true;
    } else if (date1.getMonth() > date2.getMonth()) {
        return true;
    } else if (date1.getDate() > date2.getDate()) {
        return true;
    }
    return false;
}

/**
 * Checks if the 1st date is the next day from the 2nd date
 * @param date1 1st date
 * @param date2 2nd date
 * @returns true if 1st date is one date apart, false if it isn't
 */
export function isNextDay(date1: Date, date2: Date): boolean {
    date2.setDate(date1.getDate()+1)
    return date1.toDateString() === date2.toDateString();
}