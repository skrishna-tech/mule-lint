// PomHelper.ts
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import * as fs from "fs";

export type PomCoords = {
  groupId?: string;
  artifactId?: string;
  version?: string;
};

export type MavenPluginExecution = {
  id?: string;
  phase?: string;
  goals: string[];
  configuration?: Record<string, string>;
  configurationXml?: string; // raw inner XML for config if you want it
};

export type MavenPlugin = {
  groupId?: string;
  artifactId?: string;
  version?: string;

  inherited?: string;
  extensions?: string;

  configuration?: Record<string, string>;
  configurationXml?: string; // raw inner XML for config if you want it

  executions: MavenPluginExecution[];
};
export type DistributionRepo = {
  id?: string;
  url?: string;
  name?: string;
  layout?: string;
  uniqueVersion?: string;
};

export type DistributionManagement = {
  repository?: DistributionRepo;
  snapshotRepository?: DistributionRepo;
  site?: { id?: string; url?: string };
  downloadUrl?: string;
  status?: string;
};
export type PomInfo = PomCoords & {
  packaging?: string;
  name?: string;
  description?: string;

  parent?: PomCoords & { relativePath?: string };

  properties: Record<string, string>;
  distributionManagement?: DistributionManagement;
  build?: {
    plugins: MavenPlugin[];
    pluginManagement: MavenPlugin[];
  };
};

export type PomParseOptions = {
  inheritFromParent?: boolean;
  resolvePlaceholders?: boolean;
  placeholderSources?: Record<string, string>;
};

export class PomHelper {
  static fromFile(pomPath: string, options: PomParseOptions = {}): PomInfo {
    const xml = fs.readFileSync(pomPath, "utf-8");
    return PomHelper.parse(xml, options);
  }

  static parse(xml: string, options: PomParseOptions = {}): PomInfo {
    const opts: Required<PomParseOptions> = {
      inheritFromParent: options.inheritFromParent ?? true,
      resolvePlaceholders: options.resolvePlaceholders ?? true,
      placeholderSources: options.placeholderSources ?? {},
    };

    const doc = new DOMParser({
      errorHandler: { warning: undefined, error: undefined },
    }).parseFromString(xml, "text/xml");

    const project = PomHelper.findFirstElement(doc, "project") ?? doc.documentElement;
    if (!project || PomHelper.localName(project) !== "project") {
      throw new Error("Invalid POM: <project> element not found");
    }

    // Parent
    const parentEl = PomHelper.firstChildElement(project, "parent");
    const parent: PomInfo["parent"] | undefined = parentEl
      ? {
          groupId: PomHelper.textOfChild(parentEl, "groupId"),
          artifactId: PomHelper.textOfChild(parentEl, "artifactId"),
          version: PomHelper.textOfChild(parentEl, "version"),
          relativePath: PomHelper.textOfChild(parentEl, "relativePath"),
        }
      : undefined;

    // Project coords
    let groupId = PomHelper.textOfChild(project, "groupId");
    let artifactId = PomHelper.textOfChild(project, "artifactId");
    let version = PomHelper.textOfChild(project, "version");

    const packaging = PomHelper.textOfChild(project, "packaging");
    const name = PomHelper.textOfChild(project, "name");
    const description = PomHelper.textOfChild(project, "description");

    // Inherit from parent if missing (Maven behavior)
    if (opts.inheritFromParent) {
      if (!groupId) groupId = parent?.groupId;
      if (!version) version = parent?.version;
    }

    // Properties
    const propertiesEl = PomHelper.firstChildElement(project, "properties");
    const properties = propertiesEl ? PomHelper.parseProperties(propertiesEl) : {};
    // distributionManagement
    const distEl = PomHelper.firstChildElement(project, "distributionManagement");
    const distributionManagement = distEl
      ? PomHelper.parseDistributionManagement(distEl)
      : undefined;

    // Build plugins + pluginManagement
    const buildEl = PomHelper.firstChildElement(project, "build");
    const build = buildEl ? PomHelper.parseBuild(buildEl) : undefined;

    let pom: PomInfo = {
      groupId,
      artifactId,
      version,
      packaging,
      name,
      description,
      parent,
      properties,
      distributionManagement,
      build,
    };

    // Placeholder resolution
    if (opts.resolvePlaceholders) {
      const derived = PomHelper.buildDerivedKeys(pom);
      const sources: Record<string, string> = {
        ...properties,
        ...derived,
        ...opts.placeholderSources,
      };
      pom = PomHelper.resolvePlaceholdersInPom(pom, sources);
    }

    return pom;
  }
  // ------------------------
  // Distribution Management
  // ------------------------

  private static parseDistributionManagement(distEl: Element): DistributionManagement {
    const repoEl = PomHelper.firstChildElement(distEl, "repository");
    const snapEl = PomHelper.firstChildElement(distEl, "snapshotRepository");
    const siteEl = PomHelper.firstChildElement(distEl, "site");

    return {
      repository: repoEl ? PomHelper.parseDistributionRepo(repoEl) : undefined,
      snapshotRepository: snapEl ? PomHelper.parseDistributionRepo(snapEl) : undefined,
      site: siteEl
        ? { id: PomHelper.textOfChild(siteEl, "id"), url: PomHelper.textOfChild(siteEl, "url") }
        : undefined,
      downloadUrl: PomHelper.textOfChild(distEl, "downloadUrl"),
      status: PomHelper.textOfChild(distEl, "status"),
    };
  }

  private static parseDistributionRepo(repoEl: Element): DistributionRepo {
    return {
      id: PomHelper.textOfChild(repoEl, "id"),
      url: PomHelper.textOfChild(repoEl, "url"),
      name: PomHelper.textOfChild(repoEl, "name"),
      layout: PomHelper.textOfChild(repoEl, "layout"),
      uniqueVersion: PomHelper.textOfChild(repoEl, "uniqueVersion"),
    };
  }
  // --------------------------
  // PROPERTIES
  // --------------------------

  private static parseProperties(propertiesEl: Element): Record<string, string> {
    const props: Record<string, string> = {};
    for (const el of PomHelper.childElements(propertiesEl)) {
      const key = PomHelper.localName(el);
      const value = (el.textContent ?? "").trim();
      if (key) props[key] = value;
    }
    return props;
  }

  // --------------------------
  // BUILD / PLUGINS
  // --------------------------

  private static parseBuild(buildEl: Element): PomInfo["build"] {
    // <build><plugins>...</plugins></build>
    const pluginsEl = PomHelper.firstChildElement(buildEl, "plugins");
    const plugins = pluginsEl ? PomHelper.parsePlugins(pluginsEl) : [];

    // <build><pluginManagement><plugins>...</plugins></pluginManagement></build>
    const pluginMgmtEl = PomHelper.firstChildElement(buildEl, "pluginManagement");
    const pluginMgmtPluginsEl = pluginMgmtEl
      ? PomHelper.firstChildElement(pluginMgmtEl, "plugins")
      : undefined;
    const pluginManagement = pluginMgmtPluginsEl ? PomHelper.parsePlugins(pluginMgmtPluginsEl) : [];

    return { plugins, pluginManagement };
  }

  private static parsePlugins(pluginsEl: Element): MavenPlugin[] {
    const out: MavenPlugin[] = [];
    for (const pluginEl of PomHelper.childElements(pluginsEl).filter(e => PomHelper.localName(e) === "plugin")) {
      out.push(PomHelper.parsePlugin(pluginEl));
    }
    return out;
  }

  private static parsePlugin(pluginEl: Element): MavenPlugin {
    const groupId = PomHelper.textOfChild(pluginEl, "groupId");
    const artifactId = PomHelper.textOfChild(pluginEl, "artifactId");
    const version = PomHelper.textOfChild(pluginEl, "version");

    const inherited = PomHelper.textOfChild(pluginEl, "inherited");
    const extensions = PomHelper.textOfChild(pluginEl, "extensions");

    const configurationEl = PomHelper.firstChildElement(pluginEl, "configuration");
    const { map: configuration, xml: configurationXml } = configurationEl
      ? PomHelper.parseConfiguration(configurationEl)
      : { map: undefined, xml: undefined };

    const executionsEl = PomHelper.firstChildElement(pluginEl, "executions");
    const executions = executionsEl ? PomHelper.parseExecutions(executionsEl) : [];

    return {
      groupId,
      artifactId,
      version,
      inherited,
      extensions,
      configuration,
      configurationXml,
      executions,
    };
  }

  private static parseExecutions(executionsEl: Element): MavenPluginExecution[] {
    const out: MavenPluginExecution[] = [];
    for (const execEl of PomHelper.childElements(executionsEl).filter(e => PomHelper.localName(e) === "execution")) {
      const id = PomHelper.textOfChild(execEl, "id");
      const phase = PomHelper.textOfChild(execEl, "phase");

      const goalsEl = PomHelper.firstChildElement(execEl, "goals");
      const goals = goalsEl
        ? PomHelper.childElements(goalsEl)
            .filter(g => PomHelper.localName(g) === "goal")
            .map(g => (g.textContent ?? "").trim())
            .filter(Boolean)
        : [];

      const configurationEl = PomHelper.firstChildElement(execEl, "configuration");
      const { map: configuration, xml: configurationXml } = configurationEl
        ? PomHelper.parseConfiguration(configurationEl)
        : { map: undefined, xml: undefined };

      out.push({ id, phase, goals, configuration, configurationXml });
    }
    return out;
  }

  /**
   * Parse <configuration> into:
   *  - a flat map of first-level leaf elements (good for most MUnit configs)
   *  - raw XML (when config is nested/complex)
   */
  private static parseConfiguration(configurationEl: Element): { map: Record<string, string>; xml: string } {
    const map: Record<string, string> = {};
    const serializer = new XMLSerializer();

    // raw xml for reference/debugging
    const xml = PomHelper.innerXml(configurationEl, serializer);

    // simple flatten: first-level children that are leaf nodes become key/value
    for (const child of PomHelper.childElements(configurationEl)) {
      const key = PomHelper.localName(child);
      const value = (child.textContent ?? "").trim();

      // If it contains nested elements, skip from map (still available in xml)
      const hasNestedElements = PomHelper.childElements(child).length > 0;
      if (!hasNestedElements && key) {
        map[key] = value;
      }
    }

    return { map, xml };
  }

  // --------------------------
  // PLACEHOLDER RESOLUTION
  // --------------------------

  private static buildDerivedKeys(pom: PomInfo): Record<string, string> {
    const out: Record<string, string> = {};

    if (pom.groupId) out["project.groupId"] = pom.groupId;
    if (pom.artifactId) out["project.artifactId"] = pom.artifactId;
    if (pom.version) out["project.version"] = pom.version;
    if (pom.packaging) out["project.packaging"] = pom.packaging;

    if (pom.parent?.groupId) out["project.parent.groupId"] = pom.parent.groupId;
    if (pom.parent?.artifactId) out["project.parent.artifactId"] = pom.parent.artifactId;
    if (pom.parent?.version) out["project.parent.version"] = pom.parent.version;

    return out;
  }

  private static resolvePlaceholdersInPom(pom: PomInfo, sources: Record<string, string>): PomInfo {
    const r = (v?: string) => PomHelper.resolve(sources, v);

    const resolveConfigMap = (cfg?: Record<string, string>) =>
      cfg
        ? Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, r(v) ?? v]))
        : undefined;

    const resolvePlugin = (p: MavenPlugin): MavenPlugin => ({
      ...p,
      groupId: r(p.groupId),
      artifactId: r(p.artifactId),
      version: r(p.version),
      inherited: r(p.inherited),
      extensions: r(p.extensions),
      configuration: resolveConfigMap(p.configuration),
      configurationXml: r(p.configurationXml),
      executions: p.executions.map(ex => ({
        ...ex,
        id: r(ex.id),
        phase: r(ex.phase),
        goals: ex.goals.map(g => r(g) ?? g),
        configuration: resolveConfigMap(ex.configuration),
        configurationXml: r(ex.configurationXml),
      })),
    });

    return {
      ...pom,
      groupId: r(pom.groupId),
      artifactId: r(pom.artifactId),
      version: r(pom.version),
      packaging: r(pom.packaging),
      name: r(pom.name),
      description: r(pom.description),
      parent: pom.parent
        ? {
            ...pom.parent,
            groupId: r(pom.parent.groupId),
            artifactId: r(pom.parent.artifactId),
            version: r(pom.parent.version),
            relativePath: r(pom.parent.relativePath),
          }
        : undefined,
      properties: Object.fromEntries(
        Object.entries(pom.properties).map(([k, v]) => [k, r(v) ?? v])
      ),
      build: pom.build
        ? {
            plugins: pom.build.plugins.map(resolvePlugin),
            pluginManagement: pom.build.pluginManagement.map(resolvePlugin),
          }
        : undefined,
    };
  }

  private static resolve(sources: Record<string, string>, input?: string, ): string | undefined {
    if (input === undefined) return undefined;

    let out = input;
    for (let pass = 0; pass < 6; pass++) {
      const next = out.replace(/\$\{([^}]+)\}/g, (_, key) => {
        const k = String(key).trim();
        return sources[k] !== undefined ? sources[k] : `\${${k}}`;
      });
      if (next === out) break;
      out = next;
    }
    return out;
  }

  // --------------------------
  // DOM UTILS (namespace-safe)
  // --------------------------

  private static localName(el: Element): string {
    const ln = (el as any).localName as string | undefined;
    if (ln) return ln;
    const nn = el.nodeName || "";
    const idx = nn.indexOf(":");
    return idx >= 0 ? nn.slice(idx + 1) : nn;
  }

  private static findFirstElement(doc: Document, tagLocalName: string): Element | undefined {
    const all = doc.getElementsByTagName("*");
    for (let i = 0; i < all.length; i++) {
      const el = all[i] as Element;
      if (PomHelper.localName(el) === tagLocalName) return el;
    }
    return undefined;
  }

  private static firstChildElement(parent: Element, tagLocalName: string): Element | undefined {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const n = parent.childNodes[i] as any;
      if (n?.nodeType === 1) {
        const el = n as Element;
        if (PomHelper.localName(el) === tagLocalName) return el;
      }
    }
    return undefined;
  }

  private static textOfChild(parent: Element, childLocalName: string): string | undefined {
    const child = PomHelper.firstChildElement(parent, childLocalName);
    const text = child ? (child.textContent ?? "").trim() : undefined;
    return text && text.length ? text : undefined;
  }

  private static childElements(parent: Element): Element[] {
    const out: Element[] = [];
    for (let i = 0; i < parent.childNodes.length; i++) {
      const n = parent.childNodes[i] as any;
      if (n?.nodeType === 1) out.push(n as Element);
    }
    return out;
  }

  private static innerXml(el: Element, serializer: XMLSerializer): string {
    const chunks: string[] = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      chunks.push(serializer.serializeToString(el.childNodes[i] as any));
    }
    return chunks.join("").trim();
  }

  // --------------------------
  // Convenience: find plugin
  // --------------------------

  static findPlugin(pom: PomInfo, matcher: (p: MavenPlugin) => boolean): MavenPlugin | undefined {
    const plugins = [
      ...(pom.build?.plugins ?? []),
      ...(pom.build?.pluginManagement ?? []),
    ];
    return plugins.find(matcher);
  }
}