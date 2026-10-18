// Only inspect a leading comment, so examples in the note body are ignored.
export function parsePermalinkComment(content: string, keyName: string): string | undefined {
	const comment = content.match(/^\uFEFF?\s*<!--([\s\S]*?)-->/);
	if (!comment) return;
	const entry = comment[1].trim();
	const separator = entry.indexOf(':');
	if (separator < 0 || entry.slice(0, separator).trim() !== keyName) return;
	const value = entry.slice(separator + 1).trim();
	if (!value || /[\r\n]/.test(value)) return;
	return value;
}
