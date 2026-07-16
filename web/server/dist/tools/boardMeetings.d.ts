export interface BoardMeeting {
    symbol: string;
    company: string;
    purpose: string;
    meetingDate: string;
    description: string;
}
export interface BoardMeetingsArgs {
    symbol?: string;
}
export declare function getBoardMeetings(args?: BoardMeetingsArgs): Promise<BoardMeeting[]>;
