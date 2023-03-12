Pony Music Wiki
=====================

This is some code to try to create a wiki-like database to keep track of music within the MLP fandom.

It's basically a glorified spreadsheet that anypony can edit.

Setup
==============

Postgresql
-------------------

The project uses [postgresql](https://www.postgresql.org/) as its server.
Make sure to install it prior to setup.

You will need to put the following information
in an .env file in the same directory as server.js

```
PORT=80

# Database
PGHOST=<your-host>
PGPORT=<your-port>
PGDATABASE=ponymusic
PGUSER=<your-user>
PGPASSWORD=<your-password>
```

On a local instance, there is no need to have OAuth2 authentication, however, a valid session is still needed.
A test user and session can be created by running the following SQL on your database instance

```
INSERT INTO users (id, name, role) VALUES('1', 'System', 2);
INSERT INTO sessions (session, user_id, expire_time) VALUES ('1', '1', NOW() + interval '1 year');
```


Running from source
----------------------

```bash
npm install
npm run dev
```

Allowing 
----------------
If you want to allow anyone to have readonly access to the POSTGRES daetabase, consider adding a user like octavia.

SQL:
```
CREATE ROLE octavia WITH LOGIN
NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION VALID UNTIL 'infinity';
GRANT CONNECT ON DATABASE ponymusic TO octavia;
GRANT USAGE ON SCHEMA public TO octavia;
GRANT SELECT ON tracks, track_tags TO octavia;
```

In postgresql.conf:

In pg_hba.conf:

```
host  ponymusic  octavia  0.0.0.0/0  trust
```

Sidenotes 
===============
This code is based off of a a project template for [Svelte](https://svelte.dev) apps. It lives at https://github.com/sveltejs/template.

To create a new project based on this template using [degit](https://github.com/Rich-Harris/degit):

```bash
npx degit sveltejs/template svelte-app
cd svelte-app
```
