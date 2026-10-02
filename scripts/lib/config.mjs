import { readFile } from "node:fs/promises";

const REQUIRED_STRINGS = ["username", "name", "tagline", "location", "email", "website", "status", "accent", "about", "cta"];
const HEX = /^#[0-9a-fA-F]{6}$/;

export const validateConfig = (config) => {
  const errors = [];
  if (!config || typeof config !== "object") return ["config must be an object"];

  for (const key of REQUIRED_STRINGS) {
    if (typeof config[key] !== "string" || !config[key].trim()) errors.push(`"${key}" must be a non-empty string`);
  }
  if (typeof config.accent === "string" && !HEX.test(config.accent)) errors.push(`"accent" must be a 6 digit hex color`);
  if (typeof config.email === "string" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(config.email)) errors.push(`"email" is not a valid address`);

  if (!Array.isArray(config.roles) || config.roles.length === 0) errors.push(`"roles" must be a non-empty array`);

  if (!Array.isArray(config.stack)) errors.push(`"stack" must be an array`);
  else {
    config.stack.forEach((group, index) => {
      if (!group.group || !Array.isArray(group.icons) || group.icons.length === 0) errors.push(`"stack[${index}]" needs a group name and icons`);
    });
  }

  if (!Array.isArray(config.socials)) errors.push(`"socials" must be an array`);
  else {
    config.socials.forEach((social, index) => {
      if (!social.label || !/^https?:\/\//.test(social.url ?? "")) errors.push(`"socials[${index}]" needs a label and an http(s) url`);
    });
  }

  const projects = config.projects;
  if (!projects || typeof projects !== "object") errors.push(`"projects" must be an object`);
  else {
    if (!Number.isInteger(projects.max) || projects.max < 1) errors.push(`"projects.max" must be a positive integer`);
    for (const key of ["pin", "exclude", "fallback"]) {
      if (!Array.isArray(projects[key])) errors.push(`"projects.${key}" must be an array`);
    }
  }

  return errors;
};

export const loadConfig = async (path) => {
  const config = JSON.parse(await readFile(path, "utf8"));
  const errors = validateConfig(config);
  if (errors.length > 0) throw new Error(`Invalid config:\n- ${errors.join("\n- ")}`);
  return config;
};
