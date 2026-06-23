import Foundation

enum AudioActivityPriority {
    static let conferencingBundleIDs: Set<String> = [
        "us.zoom.xos",
        "com.apple.FaceTime",
        "com.apple.FaceTimeNotificationExtension",
        "com.microsoft.teams",
        "com.microsoft.teams2",
        "com.webex.meetingmanager",
        "com.cisco.webexmeetings",
        "com.hnc.Discord",
        "com.tinyspeck.slackmacgap",
        "com.skype.skype",
        "com.amazon.chime",
        "com.goto.gotoMeeting",
        "com.logmein.joinme",
        "com.8x8.videomeeting",
    ]

    static func priority(outputRunning: Bool, inputRunning: Bool, frontmostBundleID: String?) -> Int {
        if outputRunning, inputRunning {
            return conferencingBundleIDs.contains(frontmostBundleID ?? "") ? 300 : 100
        }
        if outputRunning {
            return 100
        }
        return 0
    }
}
