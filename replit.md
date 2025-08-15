# Overview

This is a full-stack e-commerce application for educational materials, specifically focused on Turkish exam preparation books and study materials. The application is called "Kampüs Sepeti" (Campus Basket) and provides a comprehensive platform for students to browse, search, and purchase educational content with features like shopping cart, user authentication, and admin management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript running on Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, modern UI components
- **State Management**: TanStack Query (React Query) for server state management with intelligent caching and background updates
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **UI Components**: Comprehensive set of accessible components from Radix UI primitives

## Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations and migrations
- **Authentication**: Replit Auth integration with session-based authentication using OpenID Connect
- **Development**: Hot module replacement and development middleware integrated with Vite

## Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon for production scalability
- **Session Storage**: PostgreSQL-based session store for user authentication state
- **File Storage**: Google Cloud Storage integration for product images and file uploads
- **Connection Pooling**: Neon serverless database with WebSocket support for optimal connection management

## Authentication and Authorization
- **Authentication Provider**: Replit Auth with OpenID Connect flow
- **Session Management**: Express sessions with PostgreSQL backing store
- **Role-Based Access**: User roles (admin/user) for feature access control
- **Security**: HTTPS-only cookies, session expiration, and CSRF protection

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth OpenID Connect service
- **File Storage**: Google Cloud Storage for media assets
- **Development**: Replit platform integration with cartographer and runtime error overlay

### Third-Party Libraries
- **UI Framework**: Radix UI primitives for accessible components
- **File Upload**: Uppy with AWS S3 support for advanced file handling
- **Styling**: Tailwind CSS with PostCSS for utility-first styling
- **Validation**: Zod for runtime type validation and schema definition
- **Database**: Drizzle ORM with kit for migrations and schema management

### Development Tools
- **Build System**: Vite for frontend bundling and ESBuild for backend compilation
- **Type Safety**: TypeScript across the entire stack with strict configuration
- **Code Quality**: Path aliases for clean imports and consistent code organization