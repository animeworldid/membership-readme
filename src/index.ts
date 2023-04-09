import { readFileSync, writeFileSync } from "fs";
import { APIResponse, MembershipPayload, Role } from "./typings";
import { commitFile } from "./utils/commitFile";
import { parseTable } from "./utils/parseTable";
import { HttpClient } from "@actions/http-client";
import { load } from "cheerio";
import * as github from "@actions/github";
import * as core from "@actions/core";

const startAdminComment = "<!--START_SECTION:administrator_list-->";
const endAdminComment = "<!--END_SECTION:administrator_list-->";
const startMotmComment = "<!--START_SECTION:motm_list-->";
const endMotmComment = "<!--END_SECTION:motm_list-->";
const startSupporterComment = "<!--START_SECTION:supporter_list-->";
const endSupporterComment = "<!--END_SECTION:supporter_list-->";
const endpoint = "https://api.animeworld.moe/v1/membership";

if (["schedule", "workflow_dispatch"].includes(github.context.eventName)) {
    run().catch((e: Error) => core.setFailed(e));
}

async function run(): Promise<any> {
    // Fetch data from /v1/membership
    core.debug("GET /v1/membership");

    const client = new HttpClient();
    const response = await client.get(endpoint).catch((e: Error) => e);

    if (response instanceof Error) {
        return core.setFailed(`Couldn't GET ${endpoint}: ${response.message}`);
    }

    if (response.message.statusCode !== 200) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        return core.setFailed(`Received non-200 response code: ${response.message.statusCode}`);
    }

    let data: APIResponse;
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data = JSON.parse(await response.readBody()).data;
    } catch {
        return core.setFailed("Failed to parse membership data");
    }

    if (!Array.isArray(data.staff)) {
        return core.setFailed("staff column is missing");
    }

    if (!Array.isArray(data.members)) {
        return core.setFailed("members column is missing");
    }

    core.debug(`Found ${data.staff.length} staff`);
    core.debug(`Found ${data.members.length} staff`);

    if (data.staff.length === 0 || data.members.length === 0) {
        return core.info("received member data is empty, aborting update");
    }

    const highestStaff = data.staff[0];
    const [motm, supporter] = data.members;
    const motmContent = ["# Member of the Month", ...generateContent(motm)].map(x => x.replace("<table>", "<table align=\"center\">"));
    const updateResult = [
        updateSection(generateContent(highestStaff), startAdminComment, endAdminComment),
        updateSection(motmContent, startMotmComment, endMotmComment),
        updateSection(generateContent(supporter), startSupporterComment, endSupporterComment)
    ];

    if (updateResult.find(x => x)) {
        try {
            await commitFile();
        } catch (err) {
            core.info("Something went wrong");
            return core.setFailed(err as string);
        }
        core.info("Pushed to remote repository");
        process.exit(core.ExitCode.Success);
    }

    core.info("Up-to-date already");
    process.exit(core.ExitCode.Success);
}

function generateContent(data: Role & { members: MembershipPayload[] }): string[] {
    return [
        "<table>",
        ...parseTable(data.members.sort((a, b) => a.username!.localeCompare(b.username!)))
            .map(x => `<tr>${x.join("")}\n</tr>`),
        "</table>"
    ];
}

function updateSection(content: string[], start: string, end: string): boolean {
    const workingDirectory = process.env.WORKING_DIRECTORY ?? ".";
    const readmeContent = readFileSync(`${workingDirectory}/README.md`, "utf-8").split("\n");

    // Look for staff list section
    const startIndex = readmeContent.findIndex(c => c.trim() === start);
    if (startIndex === -1) {
        core.info(`Couldn't find the "${start}" comment`);
        return false;
    }

    let endIndex = readmeContent.findIndex(c => c.trim() === end);
    if (endIndex === -1) {
        core.info(`Couldn't find the "${end}" comment`);
        return false;
    }

    const newContentSelector = load(content.join(""));
    const existingData = readmeContent.slice(startIndex + 1, endIndex);
    const readmeContentSelector = load(existingData.join(""));
    endIndex = readmeContent.findIndex(c => c.trim() === endAdminComment);

    // Need to be updated
    if (newContentSelector("table td").length !== readmeContentSelector("table td").length) {
        core.info("Found diff data. Updating..");
        readmeContent.splice(startIndex + 1, 0, ...content);
        writeFileSync(`${workingDirectory}/README.md`, readmeContent.join("\n"));
        return true;
    }

    return false;
}
