import { Cartesian3 } from "cesium";

export const HOME_CAMERA = {
	destination: new Cartesian3(-1053594.94012635, -8153616.159871477, 6250954.07672872),
	orientation: {
		heading: 6.283185307179583,
		pitch: -1.5691840981764815,
		roll: 0
	},
	duration: 1
}

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

export enum IncidentParticipantAgeGroup {
    Adult = "Adult 18+",
    Teen = "Teen 12-17",
    Child = "Child 0-11",
    Unknown = "Unknown"
}

export const STR_ADULT = IncidentParticipantAgeGroup.Adult;
export const STR_TEEN = IncidentParticipantAgeGroup.Teen;
export const STR_CHILD = IncidentParticipantAgeGroup.Child;
export const STR_UNKNOWN = "Unknown";

export enum IncidentParticipantStatus {
    Killed = "Killed",
    Injured = "Injured",
    Unharmed = "Unharmed",
    Arrested = "Arrested",
    Unknown = "Unknown"
}

export enum IncidentParticipantType {
    Victim = "Killed",
    SubjectSuspect = "Injured",
    Unknown = "Unknown"
}

export enum IncidentParticipantGender {
    Male = "Male",
    Female = "Female",
    Unknown = "Unknown"
}

export const STR_FEMALE = IncidentParticipantGender.Female;
export const STR_MALE = IncidentParticipantGender.Male;

export enum IncidentGunType {
    Unknown = "Unknown",
    Other = "Other",
    Rifle = "Rifle",
    Handgun = "Handgun",
    Shotgun = "Shotgun"
}

export enum IncidentGunCaliber {
    Cal357Mag = "357 Mag",
    Cal40SW = "40 SW",
    Cal22LR = "22 LR",
    Cal45Auto = "45 Auto",
    Cal16Gauge = "16 gauge",
    Cal12Gauge = "12 gauge",
    Cal9mm = "9mm",
    Cal38Spl = "38 Spl",
    Cal3030Win = "30-30 Win",
    Cal25Auto = "25 Auto",
    Cal32Auto = "32 Auto",
    Cal762 = "7.62",
    Cal380Auto = "380 Auto",
    Cal308Win = "308 Win",
    Cal410Gauge = "410 gauge",
    Cal223Rem = "223 Rem",
    Cal20Gauge = "20 gauge",
    Cal44Mag = "44 Mag",
    Cal10mm = "10mm",
    Cal3006Spr = "30-06 Spr",
    Cal300Win = "300 Win",
    Cal28Gauge = "28 gauge"
}

export enum IncidentAttribute {
    AccidentalShooting = "Accidental Shooting",
    ChildInvolvedIncident = "Child Involved Incident",
    DefensiveUse = "Defensive Use",
    DomesticViolence = "Domestic Violence",
    DrugInvolvement = "Drug Involvement",
    GangInvolvement = "Gang Involvement",
    HomeInvasion = "Home Invasion",
    MassShooting = "Mass Shooting",
    OfficerInvolvedIncident = "Officer Involved Incident",
    SchoolIncident = "School Incident",
    Suicide = "Suicide",
    Injury = "Injury",
    Death = "Death",
    Business = "Business"
}

interface UsState {
    name: string;
    code: string;
    abbr: string;
}

interface StateDict {
    [key: string]: UsState;
}

export const US_STATES_DICT: StateDict = {
    AL: {
        name: "Alabama",
        code: "01",
        abbr: "AL"
    },
    AK: {
        name: "Alaska",
        code: "02",
        abbr: "AK"
    },
    AZ: {
        name: "Arizona",
        code: "04",
        abbr: "AZ"
    },
    AR: {
        name: "Arkansas",
        code: "05",
        abbr: "AR"
    },
    CA: {
        name: "California",
        code: "06",
        abbr: "CA"
    },
    CO: {
        name: "Colorado",
        code: "08",
        abbr: "CO"
    },
    CT: {
        name: "Connecticut",
        code: "09",
        abbr: "CT"
    },
    DE: {
        name: "Delaware",
        code: "10",
        abbr: "DE"
    },
    FL: {
        name: "Florida",
        code: "12",
        abbr: "FL"
    },
    GA: {
        name: "Georgia",
        code: "13",
        abbr: "GA"
    },
    HI: {
        name: "Hawaii",
        code: "15",
        abbr: "HI"
    },
    ID: {
        name: "Idaho",
        code: "16",
        abbr: "ID"
    },
    IL: {
        name: "Illinois",
        code: "17",
        abbr: "IL"
    },
    IN: {
        name: "Indiana",
        code: "18",
        abbr: "IN"
    },
    IA: {
        name: "Iowa",
        code: "19",
        abbr: "IA"
    },
    KS: {
        name: "Kansas",
        code: "20",
        abbr: "KS"
    },
    KY: {
        name: "Kentucky",
        code: "21",
        abbr: "KY"
    },
    LA: {
        name: "Louisiana",
        code: "22",
        abbr: "LA"
    },
    ME: {
        name: "Maine",
        code: "23",
        abbr: "ME"
    },
    MD: {
        name: "Maryland",
        code: "24",
        abbr: "MD"
    },
    MA: {
        name: "Massachusetts",
        code: "25",
        abbr: "MA"
    },
    MI: {
        name: "Michigan",
        code: "26",
        abbr: "MI"
    },
    MN: {
        name: "Minnesota",
        code: "27",
        abbr: "MN"
    },
    MS: {
        name: "Mississippi",
        code: "28",
        abbr: "MS"
    },
    MO: {
        name: "Missouri",
        code: "29",
        abbr: "MO"
    },
    MT: {
        name: "Montana",
        code: "30",
        abbr: "MT"
    },
    NE: {
        name: "Nebraska",
        code: "31",
        abbr: "NE"
    },
    NV: {
        name: "Nevada",
        code: "32",
        abbr: "NV"
    },
    NH: {
        name: "New Hampshire",
        code: "33",
        abbr: "NH"
    },
    NJ: {
        name: "New Jersey",
        code: "34",
        abbr: "NJ"
    },
    NM: {
        name: "New Mexico",
        code: "35",
        abbr: "NM"
    },
    NY: {
        name: "New York",
        code: "36",
        abbr: "NY"
    },
    NC: {
        name: "North Carolina",
        code: "37",
        abbr: "NC"
    },
    ND: {
        name: "North Dakota",
        code: "38",
        abbr: "ND"
    },
    OH: {
        name: "Ohio",
        code: "39",
        abbr: "OH"
    },
    OK: {
        name: "Oklahoma",
        code: "40",
        abbr: "OK"
    },
    OR: {
        name: "Oregon",
        code: "41",
        abbr: "OR"
    },
    PA: {
        name: "Pennsylvania",
        code: "42",
        abbr: "PA"
    },
    RI: {
        name: "Rhode Island",
        code: "44",
        abbr: "RI"
    },
    SC: {
        name: "South Carolina",
        code: "45",
        abbr: "SC"
    },
    SD: {
        name: "South Dakota",
        code: "46",
        abbr: "SD"
    },
    TN: {
        name: "Tennessee",
        code: "47",
        abbr: "TN"
    },
    TX: {
        name: "Texas",
        code: "48",
        abbr: "TX"
    },
    UT: {
        name: "Utah",
        code: "49",
        abbr: "UT"
    },
    VT: {
        name: "Vermont",
        code: "50",
        abbr: "VT"
    },
    VA: {
        name: "Virginia",
        code: "51",
        abbr: "VA"
    },
    WA: {
        name: "Washington",
        code: "53",
        abbr: "WA"
    },
    WV: {
        name: "West Virginia",
        code: "54",
        abbr: "WV"
    },
    WI: {
        name: "Wisconsin",
        code: "55",
        abbr: "WI"
    },
    WY: {
        name: "Wyoming",
        code: "56",
        abbr: "WY"
    },
    DC: {
        name: "District of Columbia",
        code: "11",
        abbr: "DC"
    },
    PR: {
        name: "Puerto Rico",
        code: "72",
        abbr: "PR"
    }
}

export function findStateByCode(code: string): UsState | undefined {
    return Object.values(US_STATES_DICT).find((state) => state.code === code);
}

export function findStateByName(name: string): UsState | undefined {
    return Object.values(US_STATES_DICT).find((state) => state.name === name);
}

export function findStateByAbbr(abbr: string): UsState | undefined {
    return Object.values(US_STATES_DICT).find((state) => state.abbr === abbr);
}