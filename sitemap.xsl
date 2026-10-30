<?xml version="1.0" encoding="UTF-8"?>
<!--
  Browser stylesheet for /sitemap.xml.

  Search engines ignore the xml-stylesheet instruction and read the XML
  directly; this file only decides what a human sees when they open the
  sitemap in a browser. It must stay a real XSLT document: Firefox refuses to
  apply it otherwise, and the XML declaration has to be the very first bytes of
  both this file and sitemap.xml.
-->
<xsl:stylesheet
  version="1.0"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  exclude-result-prefixes="sm"
>
  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  <xsl:strip-space elements="*" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>XML Sitemap - IDI</title>
        <style>
          :root {
            color-scheme: dark;
            --bg: #07090d;
            --surface: rgba(20, 25, 35, 0.62);
            --line: rgba(255, 255, 255, 0.085);
            --line-strong: rgba(255, 255, 255, 0.14);
            --text: #f4f7f5;
            --muted: #929b96;
            --faint: #626a66;
            --blue: #5a9bf2;
          }
          * {
            box-sizing: border-box;
          }
          html {
            background: var(--bg);
          }
          body {
            min-width: 320px;
            margin: 0;
            padding: clamp(1.5rem, 5vw, 4rem);
            color: var(--text);
            background:
              radial-gradient(ellipse at 15% 5%, rgba(76, 131, 255, 0.17), transparent 42%),
              radial-gradient(ellipse at 88% 38%, rgba(105, 240, 210, 0.11), transparent 38%),
              linear-gradient(180deg, #07090d 0%, #080b10 58%, #07090d 100%);
            font:
              15px/1.6 Inter,
              ui-sans-serif,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              Helvetica,
              Arial,
              sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          main {
            max-width: 1100px;
            margin: 0 auto;
          }
          .eyebrow {
            margin: 0 0 0.6rem;
            color: var(--blue);
            font: 650 0.62rem/1.4 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }
          h1 {
            margin: 0;
            font-size: clamp(2rem, 5vw, 3.4rem);
            line-height: 1;
            letter-spacing: -0.05em;
          }
          .lead {
            max-width: 70ch;
            margin: 0.9rem 0 1.6rem;
            color: var(--muted);
            font-size: 0.92rem;
          }
          .lead a {
            color: var(--blue);
          }
          .table-wrap {
            overflow-x: auto;
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 20px;
            box-shadow: 0 22px 65px rgba(0, 0, 0, 0.28);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.82rem;
          }
          caption {
            padding: 1rem 1.2rem 0;
            color: var(--faint);
            font: 650 0.6rem/1.4 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
            letter-spacing: 0.12em;
            text-align: left;
            text-transform: uppercase;
          }
          th,
          td {
            padding: 0.85rem 1.2rem;
            border-bottom: 1px solid var(--line);
            text-align: left;
            vertical-align: top;
          }
          thead th {
            color: var(--faint);
            font: 650 0.58rem/1.4 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            white-space: nowrap;
          }
          tbody th {
            font-weight: 500;
          }
          tbody tr:last-child th,
          tbody tr:last-child td {
            border-bottom: 0;
          }
          tbody tr:hover {
            background: rgba(90, 155, 242, 0.07);
          }
          a {
            color: var(--text);
            text-decoration-color: var(--line-strong);
            text-underline-offset: 0.22em;
            overflow-wrap: anywhere;
          }
          a:hover {
            color: var(--blue);
            text-decoration-color: var(--blue);
          }
          td {
            color: var(--muted);
            white-space: nowrap;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
            font-size: 0.72rem;
          }
          .priority {
            color: var(--blue);
          }
          .count {
            color: var(--muted);
            font-weight: 400;
          }
          footer {
            margin-top: 1.6rem;
            color: var(--faint);
            font-size: 0.7rem;
          }
          footer a {
            color: var(--muted);
          }
        </style>
      </head>
      <body>
        <main>
          <p class="eyebrow">International Duck Incorporated</p>
          <h1>XML Sitemap</h1>
          <p class="lead">
            A machine-readable index of this site for search engines.
            <span class="count">
              (<xsl:value-of select="count(/sm:urlset/sm:url)" /> URLs)
            </span>
          </p>

          <div class="table-wrap">
            <table>
              <caption>Sitemap entries</caption>
              <thead>
                <tr>
                  <th scope="col">URL</th>
                  <th scope="col">Last modified</th>
                  <th scope="col">Change frequency</th>
                  <th scope="col">Priority</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="/sm:urlset/sm:url">
                  <tr>
                    <th scope="row">
                      <a href="{sm:loc}">
                        <xsl:value-of select="sm:loc" />
                      </a>
                    </th>
                    <td>
                      <xsl:value-of select="sm:lastmod" />
                    </td>
                    <td>
                      <xsl:value-of select="sm:changefreq" />
                    </td>
                    <td class="priority">
                      <xsl:value-of select="sm:priority" />
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>

          <footer>
            This is a rendered view of
            <a href="/sitemap.xml">/sitemap.xml</a>; crawlers read the underlying XML.
          </footer>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
