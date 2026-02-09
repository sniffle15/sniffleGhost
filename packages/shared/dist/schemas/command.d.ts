import { z } from "zod";
export declare const CommandTypeSchema: z.ZodEnum<["SLASH", "PREFIX"]>;
export declare const EventTypeSchema: z.ZodEnum<["MESSAGE_CREATE", "MESSAGE_DELETE", "MESSAGE_UPDATE", "CHANNEL_CREATE", "CHANNEL_DELETE", "CHANNEL_UPDATE", "VOICE_CHANNEL_JOIN", "VOICE_CHANNEL_LEAVE", "VOICE_CHANNEL_MOVE", "MEMBER_JOIN", "MEMBER_LEAVE"]>;
export declare const CommandPermissionsSchema: z.ZodObject<{
    adminOnly: z.ZodDefault<z.ZodBoolean>;
    roleAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    channelAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    adminOnly: boolean;
    roleAllowlist: string[];
    channelAllowlist: string[];
}, {
    adminOnly?: boolean | undefined;
    roleAllowlist?: string[] | undefined;
    channelAllowlist?: string[] | undefined;
}>;
export declare const CommandCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    type: z.ZodEnum<["SLASH", "PREFIX"]>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodDefault<z.ZodEnum<["string", "int", "bool", "user", "channel", "role"]>>;
        required: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "string" | "user" | "channel" | "int" | "bool" | "role";
        name: string;
        required: boolean;
        description?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
        type?: "string" | "user" | "channel" | "int" | "bool" | "role" | undefined;
        required?: boolean | undefined;
    }>, "many">>;
    permissions: z.ZodOptional<z.ZodObject<{
        adminOnly: z.ZodDefault<z.ZodBoolean>;
        roleAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        channelAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        adminOnly: boolean;
        roleAllowlist: string[];
        channelAllowlist: string[];
    }, {
        adminOnly?: boolean | undefined;
        roleAllowlist?: string[] | undefined;
        channelAllowlist?: string[] | undefined;
    }>>;
    cooldownSeconds: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description: string;
    type: "SLASH" | "PREFIX";
    name: string;
    cooldownSeconds: number;
    options?: {
        type: "string" | "user" | "channel" | "int" | "bool" | "role";
        name: string;
        required: boolean;
        description?: string | undefined;
    }[] | undefined;
    permissions?: {
        adminOnly: boolean;
        roleAllowlist: string[];
        channelAllowlist: string[];
    } | undefined;
}, {
    description: string;
    type: "SLASH" | "PREFIX";
    name: string;
    options?: {
        name: string;
        description?: string | undefined;
        type?: "string" | "user" | "channel" | "int" | "bool" | "role" | undefined;
        required?: boolean | undefined;
    }[] | undefined;
    permissions?: {
        adminOnly?: boolean | undefined;
        roleAllowlist?: string[] | undefined;
        channelAllowlist?: string[] | undefined;
    } | undefined;
    cooldownSeconds?: number | undefined;
}>;
export declare const CommandUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["SLASH", "PREFIX"]>>;
    options: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodDefault<z.ZodEnum<["string", "int", "bool", "user", "channel", "role"]>>;
        required: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "string" | "user" | "channel" | "int" | "bool" | "role";
        name: string;
        required: boolean;
        description?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
        type?: "string" | "user" | "channel" | "int" | "bool" | "role" | undefined;
        required?: boolean | undefined;
    }>, "many">>>;
    permissions: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        adminOnly: z.ZodDefault<z.ZodBoolean>;
        roleAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        channelAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        adminOnly: boolean;
        roleAllowlist: string[];
        channelAllowlist: string[];
    }, {
        adminOnly?: boolean | undefined;
        roleAllowlist?: string[] | undefined;
        channelAllowlist?: string[] | undefined;
    }>>>;
    cooldownSeconds: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    type?: "SLASH" | "PREFIX" | undefined;
    options?: {
        type: "string" | "user" | "channel" | "int" | "bool" | "role";
        name: string;
        required: boolean;
        description?: string | undefined;
    }[] | undefined;
    name?: string | undefined;
    permissions?: {
        adminOnly: boolean;
        roleAllowlist: string[];
        channelAllowlist: string[];
    } | undefined;
    cooldownSeconds?: number | undefined;
}, {
    description?: string | undefined;
    type?: "SLASH" | "PREFIX" | undefined;
    options?: {
        name: string;
        description?: string | undefined;
        type?: "string" | "user" | "channel" | "int" | "bool" | "role" | undefined;
        required?: boolean | undefined;
    }[] | undefined;
    name?: string | undefined;
    permissions?: {
        adminOnly?: boolean | undefined;
        roleAllowlist?: string[] | undefined;
        channelAllowlist?: string[] | undefined;
    } | undefined;
    cooldownSeconds?: number | undefined;
}>;
export declare const CommandVersionCreateSchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
}, {
    notes?: string | undefined;
}>;
export declare const EventCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    eventType: z.ZodEnum<["MESSAGE_CREATE", "MESSAGE_DELETE", "MESSAGE_UPDATE", "CHANNEL_CREATE", "CHANNEL_DELETE", "CHANNEL_UPDATE", "VOICE_CHANNEL_JOIN", "VOICE_CHANNEL_LEAVE", "VOICE_CHANNEL_MOVE", "MEMBER_JOIN", "MEMBER_LEAVE"]>;
}, "strip", z.ZodTypeAny, {
    description: string;
    eventType: "MESSAGE_CREATE" | "MESSAGE_DELETE" | "MESSAGE_UPDATE" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_UPDATE" | "VOICE_CHANNEL_JOIN" | "VOICE_CHANNEL_LEAVE" | "VOICE_CHANNEL_MOVE" | "MEMBER_JOIN" | "MEMBER_LEAVE";
    name: string;
}, {
    eventType: "MESSAGE_CREATE" | "MESSAGE_DELETE" | "MESSAGE_UPDATE" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_UPDATE" | "VOICE_CHANNEL_JOIN" | "VOICE_CHANNEL_LEAVE" | "VOICE_CHANNEL_MOVE" | "MEMBER_JOIN" | "MEMBER_LEAVE";
    name: string;
    description?: string | undefined;
}>;
export declare const EventUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    eventType: z.ZodOptional<z.ZodEnum<["MESSAGE_CREATE", "MESSAGE_DELETE", "MESSAGE_UPDATE", "CHANNEL_CREATE", "CHANNEL_DELETE", "CHANNEL_UPDATE", "VOICE_CHANNEL_JOIN", "VOICE_CHANNEL_LEAVE", "VOICE_CHANNEL_MOVE", "MEMBER_JOIN", "MEMBER_LEAVE"]>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    eventType?: "MESSAGE_CREATE" | "MESSAGE_DELETE" | "MESSAGE_UPDATE" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_UPDATE" | "VOICE_CHANNEL_JOIN" | "VOICE_CHANNEL_LEAVE" | "VOICE_CHANNEL_MOVE" | "MEMBER_JOIN" | "MEMBER_LEAVE" | undefined;
    name?: string | undefined;
}, {
    description?: string | undefined;
    eventType?: "MESSAGE_CREATE" | "MESSAGE_DELETE" | "MESSAGE_UPDATE" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_UPDATE" | "VOICE_CHANNEL_JOIN" | "VOICE_CHANNEL_LEAVE" | "VOICE_CHANNEL_MOVE" | "MEMBER_JOIN" | "MEMBER_LEAVE" | undefined;
    name?: string | undefined;
}>;
