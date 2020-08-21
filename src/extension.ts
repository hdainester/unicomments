import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let disposable1 = vscode.commands.registerCommand("unicomments.unify-selection", () => {
		var editor = vscode.window.activeTextEditor;

		editor?.edit(builder => editor?.selections.forEach(
			selection => builder.replace(selection, unifyComments(
				editor?.document.getText(selection)))));
	});

	let disposable2 = vscode.commands.registerCommand("unicomments.unify-document", () => {
		var editor = vscode.window.activeTextEditor;
		var range = editor?.document.validateRange(
			new vscode.Range(
				new vscode.Position(0, 0),
				new vscode.Position(Number.MAX_VALUE, Number.MAX_VALUE))) ||
			new vscode.Range(
				new vscode.Position(0, 0),
				new vscode.Position(0, 0));

		editor?.edit(builder => builder.replace(
			range, unifyComments(editor?.document.getText())));
	});

	context.subscriptions.push(disposable1);
	context.subscriptions.push(disposable2);
}

export function deactivate() {}

function lineIsComment(line : string) {
	var commentLineStarters = vscode.workspace
		.getConfiguration("unicomments")
		.get<string[]>("commentLineStarters") || [];

	for(let cls of commentLineStarters) {
		if(line.trimLeft().startsWith(cls)) {
			return true;
		}
	}

	return false;
}

function unifyComments(text : string | undefined) {
	if(text === undefined) {
		return "";
	}

	var eol : string;
	switch(vscode.window.activeTextEditor?.document.eol) {
		case vscode.EndOfLine.LF:
			eol = "\n";
			break;
		case vscode.EndOfLine.CRLF:
			eol = "\r\n";
			break;
		default:
			eol = "\n";
			break;
	}

	var maxLength = vscode.workspace
		.getConfiguration("unicomments")
		.get<Number>("commentLineLength") || Number.MAX_VALUE;

	var newText = "";
	var newLine = "";
	var remainder = "";
	var indent = "";
	var lineStart = "";

	text.split(eol).forEach(line => {
		if(lineIsComment(line)) {
			var words = line.trim().split(" ");
			indent = line.substr(0, line.indexOf(words[0]));
			lineStart = words[0];
			newLine = indent + lineStart + remainder;

			if(words.length === 1) {
				newText += (newText.length > 0 ? eol : "") + newLine;
			}

			for(var i = 1; i < words.length; ++i) {
				var lineProbe = newLine.substr(newLine.indexOf(lineStart) + lineStart.length + 1) + " " + words[i];
				lineProbe = lineProbe.trimLeft();

				if(lineProbe.length > maxLength) {
					if(lineProbe.split(" ").length === 1) {
						newLine += " " + words[i];
						newText += (newText.length > 0 ? eol : "") + newLine.trimRight();
						newLine = indent + lineStart;
					} else {
						newText += (newText.length > 0 ? eol : "") + newLine.trimRight();
						newLine = indent + lineStart + " " + words[i];
					}
				} else {
					newLine += " " + words[i];
				}

				if(i === words.length-1) {
					remainder = " " + newLine.substr(newLine.indexOf(lineStart) + lineStart.length + 1);
				}
			}
		} else {
			if(remainder.length > 0) {
				newText += eol + indent + lineStart + remainder;
				remainder = "";
			}

			newText += (newText.length > 0 ? eol : "") + line;
		}
	});

	if(remainder.length > 0) {
		newText += eol + indent + lineStart + remainder;
	}

	return newText;
}