// command line text colors
export * as Colors from "https://deno.land/std@0.100.0/fmt/colors.ts";

// command line, stdio
export { readLines, BufReader, BufWriter } from "https://deno.land/std@0.97.0/io/bufio.ts";
export { TextProtoReader } from "https://deno.land/std/textproto/mod.ts";
export { writeAll } from "https://deno.land/std@0.100.0/io/util.ts";

// testing
export { assertEquals } from "https://deno.land/std@0.98.0/testing/asserts.ts";