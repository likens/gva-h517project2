export type Incident = {
    id: string,
    date: string,
    nkill: string,
    ninj: string,
    cd: string,
    gstolen: string,
    gtype: string,
    attr: string,
    lat: string,
    lng: string,
    nguns: string,
    ages: string,
    agroups: string,
    genders: string,
    prship: string,
    pstatus: string,
    ptype: string,
    cty: string,
    cny: string,
    st: string
}

enum IncidentParticipantAgeGroup {
    Adult = "Adult 18+",
    Teen = "Teen 12-17",
    Child = "Child 0-11"
}

export const STR_ADULT = IncidentParticipantAgeGroup.Adult;
export const STR_TEEN = IncidentParticipantAgeGroup.Teen;
export const STR_CHILD = IncidentParticipantAgeGroup.Child;

// enum IncidentParticipantStatus {
//     Killed,
//     Injured,
//     Unharmed,
//     Arrested
// }

// enum IncidentParticipantType {
//     Victim,
//     Subject_Suspect
// }

enum IncidentParticipantGender {
    Male = "Male",
    Female = "Female"
}

export const STR_FEMALE = IncidentParticipantGender.Female;
export const STR_MALE = IncidentParticipantGender.Male;

interface UsState {
    full: string;
    code: string;
    abbr: string;
}

interface StateDict {
    [key: string]: UsState;
}

export const US_STATES_DICT: StateDict = {
    AL: {
        full: "Alabama",
        code: "01",
        abbr: "AL"
    },
    AK: {
        full: "Alaska",
        code: "02",
        abbr: "AK"
    },
    AZ: {
        full: "Arizona",
        code: "04",
        abbr: "AZ"
    },
    AR: {
        full: "Arkansas",
        code: "05",
        abbr: "AR"
    },
    CA: {
        full: "California",
        code: "06",
        abbr: "CA"
    },
    CO: {
        full: "Colorado",
        code: "08",
        abbr: "CO"
    },
    CT: {
        full: "Connecticut",
        code: "09",
        abbr: "CT"
    },
    DE: {
        full: "Delaware",
        code: "10",
        abbr: "DE"
    },
    FL: {
        full: "Florida",
        code: "12",
        abbr: "FL"
    },
    GA: {
        full: "Georgia",
        code: "13",
        abbr: "GA"
    },
    HI: {
        full: "Hawaii",
        code: "15",
        abbr: "HI"
    },
    ID: {
        full: "Idaho",
        code: "16",
        abbr: "ID"
    },
    IL: {
        full: "Illinois",
        code: "17",
        abbr: "IL"
    },
    IN: {
        full: "Indiana",
        code: "18",
        abbr: "IN"
    },
    IA: {
        full: "Iowa",
        code: "19",
        abbr: "IA"
    },
    KS: {
        full: "Kansas",
        code: "20",
        abbr: "KS"
    },
    KY: {
        full: "Kentucky",
        code: "21",
        abbr: "KY"
    },
    LA: {
        full: "Louisiana",
        code: "22",
        abbr: "LA"
    },
    ME: {
        full: "Maine",
        code: "23",
        abbr: "ME"
    },
    MD: {
        full: "Maryland",
        code: "24",
        abbr: "MD"
    },
    MA: {
        full: "Massachusetts",
        code: "25",
        abbr: "MA"
    },
    MI: {
        full: "Michigan",
        code: "26",
        abbr: "MI"
    },
    MN: {
        full: "Minnesota",
        code: "27",
        abbr: "MN"
    },
    MS: {
        full: "Mississippi",
        code: "28",
        abbr: "MS"
    },
    MO: {
        full: "Missouri",
        code: "29",
        abbr: "MO"
    },
    MT: {
        full: "Montana",
        code: "30",
        abbr: "MT"
    },
    NE: {
        full: "Nebraska",
        code: "31",
        abbr: "NE"
    },
    NV: {
        full: "Nevada",
        code: "32",
        abbr: "NV"
    },
    NH: {
        full: "New Hampshire",
        code: "33",
        abbr: "NH"
    },
    NJ: {
        full: "New Jersey",
        code: "34",
        abbr: "NJ"
    },
    NM: {
        full: "New Mexico",
        code: "35",
        abbr: "NM"
    },
    NY: {
        full: "New York",
        code: "36",
        abbr: "NY"
    },
    NC: {
        full: "North Carolina",
        code: "37",
        abbr: "NC"
    },
    ND: {
        full: "North Dakota",
        code: "38",
        abbr: "ND"
    },
    OH: {
        full: "Ohio",
        code: "39",
        abbr: "OH"
    },
    OK: {
        full: "Oklahoma",
        code: "40",
        abbr: "OK"
    },
    OR: {
        full: "Oregon",
        code: "41",
        abbr: "OR"
    },
    PA: {
        full: "Pennsylvania",
        code: "42",
        abbr: "PA"
    },
    RI: {
        full: "Rhode Island",
        code: "44",
        abbr: "RI"
    },
    SC: {
        full: "South Carolina",
        code: "45",
        abbr: "SC"
    },
    SD: {
        full: "South Dakota",
        code: "46",
        abbr: "SD"
    },
    TN: {
        full: "Tennessee",
        code: "47",
        abbr: "TN"
    },
    TX: {
        full: "Texas",
        code: "48",
        abbr: "TX"
    },
    UT: {
        full: "Utah",
        code: "49",
        abbr: "UT"
    },
    VT: {
        full: "Vermont",
        code: "50",
        abbr: "VT"
    },
    VA: {
        full: "Virginia",
        code: "51",
        abbr: "VA"
    },
    WA: {
        full: "Washington",
        code: "53",
        abbr: "WA"
    },
    WV: {
        full: "West Virginia",
        code: "54",
        abbr: "WV"
    },
    WI: {
        full: "Wisconsin",
        code: "55",
        abbr: "WI"
    },
    WY: {
        full: "Wyoming",
        code: "56",
        abbr: "WY"
    },
    DC: {
        full: "District of Columbia",
        code: "11",
        abbr: "DC"
    },
    PR: {
        full: "Puerto Rico",
        code: "72",
        abbr: "PR"
    }
}

export function findStateByCode(code: string): UsState | undefined {
    return Object.values(US_STATES_DICT).find((state) => state.code === code);
}