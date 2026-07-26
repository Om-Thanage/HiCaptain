# CLAUDE.md - HiCaptain Project Guide

## Project Overview
HiCaptain is a full-stack application with a Java Spring Boot backend and a Next.js frontend. It integrates with GitHub and Google Calendar and features project management (Kanban), analytics, invoicing, and user management.

## Core Purpose
Centralized product/project management tool solving fragmentation across scheduling, Git integration, billing, and client feedback tools. Target users (per use-case diagram): Client, Project Manager, Tech Worker, Admin — small dev agencies/teams managing client projects end-to-end (tasks, GitHub sync, invoicing, support tickets) in one place.

## Tech Stack
- **Backend:** Java 17, Spring Boot 3.5.7, MongoDB, Spring Security, JWT, Maven.
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand, Recharts, Axios.
- **Integrations:** GitHub API, Google Calendar API.

## Infrastructure
- **Database:** MongoDB Atlas.
- **Deployment target:** AWS EC2.
- **Env config:** `.env.example` to be provided separately — **do not assume or invent variable names** (JWT secret, Mongo URI, GitHub/Google client IDs, etc.) until it's supplied. Ask before scaffolding config.

## Auth Flow
Per SRS: JWT-based, with OAuth2 referenced as supporting infrastructure. Not yet confirmed whether GitHub/Google OAuth is meant to be a primary login method or a secondary linked integration (distinct from the GitHub API integration used for commit/PR sync, which is app-level, not user-auth). Confirm actual implementation in code before documenting this as settled.

## Build & Run Commands

### Backend
- **Build:** `./mvnw clean install`
- **Run:** `./mvnw spring-boot:run`
- **Test:** `./mvnw test`

### Frontend
- **Install:** `npm install` (inside `/frontend`)
- **Dev Mode:** `npm run dev` (inside `/frontend`)
- **Build:** `npm run build` (inside `/frontend`)
- **Start:** `npm run start` (inside `/frontend`)
- **Lint:** `npm run lint` (inside `/frontend`)

## Coding Standards
- **Backend:**
  - Follow Spring Boot best practices (Controller -> Service -> Repository).
  - Use Lombok for boilerplate reduction.
  - Adhere to Java 17 naming conventions.
- **Frontend:**
  - Use TypeScript for type safety.
  - Follow Next.js App Router patterns.
  - Use Tailwind CSS for styling.

## Current Priorities
Follow HiCaptainChecklist.md — in order, Tier 1 before Tier 2 before Tier 3. Do not skip ahead to polish (Tier 3) while Tier 1 items are incomplete; deadline is fixed and Tier 1 is what the resume claim depends on.

## Test Requirements
Minimum bar: one test proving that a Developer-role account is blocked from Admin-only endpoints, enforced server-side (not just hidden in the UI). This is non-negotiable — it's the concrete evidence behind the RBAC claim being used externally. Additional tests welcome if time allows, but this one is required.