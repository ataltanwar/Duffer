# Duffer -- Final Product Requirements Document (PRD)

## 1. Product Overview

Duffer is an anonymous social platform where users share short text
posts in a single global feed and interact using emoji reactions.

The platform emphasizes **content over identity**. Users remain
anonymous to each other while competing to create engaging posts that
generate reactions.

The initial version focuses on **simplicity, authenticity, and
engagement** rather than complex social features.

------------------------------------------------------------------------

## 2. Product Vision

Create a platform where people can freely express thoughts and interact
with ideas without the pressure of personal identity or follower counts.

Duffer aims to become a place where: - anyone can post instantly\
- conversations feel natural and unfiltered\
- ideas spread through engagement rather than popularity

------------------------------------------------------------------------

## 3. Product Philosophy

**Content wins, not popularity.**

Duffer is designed as a **competitive anonymous social network** where
users compete through:

-   funny posts
-   clever thoughts
-   viral reactions

The platform removes followers and popularity systems so discovery is
driven by engagement.

------------------------------------------------------------------------

## 4. Target Users

Primary users:

-   college students\
-   Gen‑Z internet users\
-   people who enjoy spontaneous online conversations\
-   users who prefer anonymous expression

------------------------------------------------------------------------

## 5. Identity and Authentication

Users sign in using **Google Sign‑In**.

After login, the system generates a **persistent anonymous username**.

Example:

    Google account → Duffer identity

    rahul@gmail.com → Anon_4821

Rules:

-   real identity is never shown publicly\
-   email remains private\
-   anonymous username is visible publicly\
-   username persists across sessions

------------------------------------------------------------------------

## 6. Social Structure

Duffer intentionally does **not include**:

-   followers\
-   following lists\
-   popularity indicators

Users cannot follow other users.\
All posts compete within the same feed.

Ideas spread through **reactions rather than follower networks**.

------------------------------------------------------------------------

## 7. Core MVP Features

The first version focuses on validating the core interaction model.

**MVP Feature List**

-   Google authentication\
-   persistent anonymous usernames\
-   post creation\
-   global feed\
-   emoji reactions\
-   admin moderation tools

------------------------------------------------------------------------

## 8. Post Creation

Users can create short text posts.

**Post requirements**

-   text only\
-   maximum length: **200 characters**

Example:

    Why does productivity suddenly start at 2am?

Posting flow:

    Write post
    ↓
    Press POST
    ↓
    Post appears in feed

------------------------------------------------------------------------

## 9. Global Feed

Duffer uses **one universal feed**.

Feed characteristics:

-   newest posts appear first\
-   continuous vertical scrolling\
-   no algorithmic ranking in MVP

Example:

    Anon_4821
    Why are nights so peaceful?

    😂 8   🤯 3   🤔 4

------------------------------------------------------------------------

## 10. Reaction System

Users react to posts using an **emoji picker**, similar to modern
messaging apps.

Reaction flow:

    Tap react
    ↓
    Emoji picker opens
    ↓
    User selects emoji
    ↓
    Reaction appears on post

Rules:

-   users can react with **any emoji**
-   reaction counts are visible
-   multiple users can react to the same post

Example:

    😂 14   🤯 6   💀 4   🔥 3

------------------------------------------------------------------------

## 11. Platform Culture

Duffer encourages **authentic and spontaneous communication** common in
student communities.

Casual slang and informal language are allowed.

Examples:

    wtf
    bro
    damn
    unc
    clap

The goal is natural conversation rather than overly filtered speech.

------------------------------------------------------------------------

## 12. Content Restrictions

The platform will remove posts containing:

-   threats of violence\
-   encouragement of self‑harm\
-   illegal activity\
-   extreme harassment

Users repeatedly posting harmful content may be **banned**.

------------------------------------------------------------------------

## 13. Moderation System

During the MVP phase moderation will be **simple and manual**.

The **admin (creator of Duffer)** can:

-   remove posts\
-   ban abusive users

------------------------------------------------------------------------

## 14. Features Excluded From MVP

The following are intentionally excluded:

-   followers\
-   user profiles\
-   private messaging\
-   comments\
-   image or video posts\
-   trending feeds\
-   algorithmic ranking\
-   **Top Post of the Day (TPD)**

------------------------------------------------------------------------

## 15. Future Feature -- Top Post of the Day (TPD)

TPD highlights the post that receives the **highest number of reactions
within a single day**.

Example:

    Top Post Today

    Anon_4821
    Why does productivity start at 2am?

    😂 42   🤯 18   💀 7

Rules:

-   based on **total reactions**
-   resets every **24 hours**
-   highlights **posts rather than users**

------------------------------------------------------------------------

## 16. Future Moderation Enhancements

Possible improvements after platform growth:

-   post reporting system\
-   automated threat detection\
-   strong language labels

------------------------------------------------------------------------

## 17. Success Metrics

Success of the MVP will be evaluated using:

-   daily active users\
-   posts per day\
-   reactions per post\
-   average session duration

------------------------------------------------------------------------

## 18. MVP Objective

The MVP aims to validate:

1.  Users post anonymous thoughts regularly\
2.  Emoji reactions create engagement\
3.  A single global feed drives interaction

------------------------------------------------------------------------

## 19. Product Positioning

**Duffer** is:

> A competitive anonymous social network where content wins, not
> popularity.

Core pillars:

-   anonymous identity\
-   reaction‑driven engagement\
-   fair content discovery\
-   spontaneous conversations
