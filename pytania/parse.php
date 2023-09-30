<?php

if (count($argv) < 2) {
	die('Nie podano pliku konfiguracyjnego.');
}

$confFile = array_pop($argv);
if (!file_exists($confFile)) {
	die('Podany plik konfiguracyjny nie istnieje.');
}

$options = json_decode(file_get_contents($confFile), true);

if (!is_array($options) || count($options) != 8) {
	die('Plik konfiguracyjny zostal zle przygotowany.');
}

$author = $options['author'];
$title = $options['title'];
$separator = $options['separator'];
$csvEncoding = (isset($options['csvencoding'])) ? $options['csvencoding'] : '';
$parEncoding = 'UTF-8';

define('DS', $options['directory_separator']);

switch ($csvEncoding) {
	case 'win1250':
		$csvEncoding = 'WINDOWS-1250';
		break;
	default:
		$csvEncoding = 'UTF-8';
}

$buttons = $options['buttons'];
empty($buttons) && $buttons = ['answered-one'];

$mediaPath = $options['media'];
$jsPath = 'js';

$fileName = $options['csvfile'];
if (empty($fileName) || strpos($fileName, '.csv') === false) {
	die('Brak pliku z pytaniami.');
}

if (!is_dir($mediaPath)) {
	die('Brak folderu z plikami multimedialnymi.');
}

$file = file($fileName);
$newFile = [];
foreach ($file as $line) {
	if (preg_match('/\d{1,3}/', $line)) {
		array_push($newFile, $line);
	} else {
		$previousLine = array_pop($newFile);
		$previousLine .= $line;
		array_push($newFile, $previousLine);
	}
}
$file = $newFile;

$questions = array_map(function($value) use ($separator) {
	return str_getcsv($value, $separator);
}, $file);

$questionIds = [];
$foundFiles = [];
$allFiles = [];
$parsedQuestions = [];
$noErrors = true;
$logFile = './log.txt';

if (file_exists($logFile)) {
	unlink($logFile);
}

function flog($text) {
	global $logFile;
	$f = fopen($logFile, 'a');
	fwrite($f, $text);
	fclose($f);
}

function processFile($mediaPath, $id, $ext, &$foundFiles, $type = '') {
	if (file_exists($mediaPath . DS . '00' . $id . $type . '.' . $ext)) {
		if ($id < 10) {
			$foundFiles[] = '00' . $id . $type . '.' . $ext;	
		}
	} elseif (file_exists($mediaPath . DS . '0' . $id . $type . '.' . $ext)) {
		if ($id < 10) {
			$oldName = $mediaPath . DS . '0' . $id . $type . '.' . $ext;
			$newName = $mediaPath . DS . '00' . $id . $type . '.' . $ext;
			flog('Zmienilem nazwe pliku <' . $oldName . '> na <' . $newName . '>' . PHP_EOL);
			rename($oldName, $newName);
			$foundFiles[] = '00' . $id . $type . '.' . $ext;
		} elseif ($id < 100) {
			$foundFiles[] = '0' . $id . $type . '.' . $ext;
		}
	} elseif (file_exists($mediaPath . DS . $id . $type . '.' . $ext)) {
		if ($id < 10) {
			$oldName = $mediaPath . DS . $id . $type . '.' . $ext;
			$newName = $mediaPath . DS . '00' . $id . $type . '.' . $ext;
			flog('Zmienilem nazwe pliku <' . $oldName . '> na <' . $newName . '>' . PHP_EOL);
			rename($oldName, $newName);
			$foundFiles[] = '00' . $id . $type . '.' . $ext;			
		} elseif ($id < 100) {
			$oldName = $mediaPath . DS . $id . $type . '.' . $ext;
			$newName = $mediaPath . DS . '0' . $id . $type . '.' . $ext;
			flog('Zmienilem nazwe pliku <' . $oldName . '> na <' . $newName . '>' . PHP_EOL);
			rename($oldName, $newName);
			$foundFiles[] = '0' . $id . $type . '.' . $ext;			
		} elseif ($id < 1000) {
			$foundFiles[] = $id . $type . '.' . $ext;			
		}
	} else {
		$soughtId = str_pad($id, 3, '0', STR_PAD_LEFT);
		flog('Nie znalazlem pliku: <' . $soughtId . $type . '.' . $ext . '>' . PHP_EOL);
		return false;
	}
	return true;
}

function array_empty($arr) {
	$empty = true;
	foreach ($arr as $elem) {
		if (!empty($elem)) {
			$empty = false;
			break;
		}
	}
	return $empty;
}

function prepareText($text) {
	$text = strtr($text, [
		'„' => '"',
		'”' => '"',
	]);
	$text = str_replace('[b]', '<strong>', $text);
	$text = str_replace('[/b]', '</strong>', $text);
	$text = str_replace('[i]', '<em>', $text);
	$text = str_replace('[/i]', '</em>', $text);
	$text = str_replace('[hide]', '<span class="hide">', $text);
	$text = str_replace('[/hide]', '</span>', $text);
	$text = preg_replace('/\r?\n/', '<br />', $text);
	
	return trim($text);
}

function prepEnc($text, $encoding = 'UTF-8') {
	$text = str_replace(chr(136), '', $text);
	$text = str_replace(chr(152), '', $text);
	if ($encoding != 'UTF-8') {
		$text = iconv($encoding, 'UTF-8', $text);
	}
	return $text;
}

// Remove the column headers' row
array_shift($questions);

/*
$questionFileNames = scandir($title . '/' . 'media');
foreach ($questionFileNames as $file) {
	if (!is_dir('pytania/' . $file) && strpos($file, '.js') === false) {
		$lcaseFile = mb_strtolower($file);
		if ($lcaseFile != $file) {
			flog('Renaming <pytania/' . $file . '> to <pytania/' . $lcaseFile . '>' . PHP_EOL);
			rename('pytania/' . $file, 'pytania/' . $lcaseFile);
		}
	}
}
*/

foreach ($questions as $q) {
	/*
	0 - id
	1 - q
	2 - q type
	3 - a
	4 - a type
	5 - cat 
	*/
	$goNext = false;
	if (empty($q[1]) && empty($q[2])) {
		$noErrors = false;
		flog('Pytanie i typ pytania puste: ' . $q[0] . PHP_EOL);
		$goNext = true;
	}
	if (false && $goNext) {
		continue;
	}

	$id = (int)$q[0];
	if (in_array($id, $questionIds)) {
		flog('Powtorzone pytanie: ' . $id . PHP_EOL);
		$noErrors = false;
		continue;
	}
	$questionIds[] = $id;
	$q[1] = prepareText($q[1]);
	$q[2] = trim($q[2]);
	$q[3] = prepareText($q[3]);
	$q[4] = trim($q[4]);
	if (!empty($q[2])) {
		$result = processFile($mediaPath, $id, $q[2], $foundFiles, '');
		$noErrors = $noErrors && $result;
	}
	if (!empty($q[4])) {
		$result = processFile($mediaPath, $id, $q[4], $foundFiles, 'a');
		$noErrors = $noErrors && $result;
	}
	$parsedQuestions[] = [
		'id' => str_pad($id, 3, '0', STR_PAD_LEFT),
		'questionText' => prepEnc($q[1], $csvEncoding),
		'questionType' => $q[2],
		'answerText' => prepEnc($q[3], $csvEncoding),
		'answerType' => $q[4],
		'category' => !empty($q[5]) ? prepEnc($q[5], $csvEncoding) : '',
	];
}

$allFiles = array_filter(scandir($mediaPath), function($file) use ($mediaPath) {
	return !is_dir($mediaPath . DS . $file) && mb_strpos($file, '.js') === false;
});

$additionalFiles = array_diff($allFiles, $foundFiles);
foreach ($additionalFiles as $file) {
	flog('Dodatkowy plik: <' . $file . '>' . PHP_EOL);
}

$codeName = $mediaPath;
$questionJSFile = getcwd() . DS . $jsPath . DS . $codeName . '.js';
$f = fopen($questionJSFile, 'w');

// Prepare config.js file

$allQuestionFiles = array_filter(scandir($jsPath), function($file) use ($jsPath) {
	return !is_dir($jsPath . DS . $file) && ($file != '.gitkeep');
});

$config = 'const quizzes = [];' . PHP_EOL . PHP_EOL;
$config .= 'const config = {' . PHP_EOL;
$config .= "\t" . 'quizFiles: ' . json_encode(array_values($allQuestionFiles)) . ',' . PHP_EOL;
$config .= "\t" . 'imageTypes: [\'png\', \'gif\', \'jpg\', \'jpeg\', \'bmp\', \'webp\'],' . PHP_EOL;
$config .= "\t" . 'debugMode: false' . PHP_EOL;
$config .= '};' . PHP_EOL;
file_put_contents('../js/config.js', $config);

$encodedQuestions = json_encode($parsedQuestions);
if (!$encodedQuestions) {
	die('Nieprawidlowe kodowanie pytan.');
} else {
	$resultFile = 'const newQuiz = {"author":' . json_encode(prepEnc($author, $parEncoding))
		. ',"title":' . json_encode(prepEnc($title, $parEncoding))
		. ',"questions":' . $encodedQuestions
		. ',"buttons":' . json_encode($buttons)
		. ',"code":' . json_encode(prepEnc($codeName, $parEncoding)) . '};' . PHP_EOL . PHP_EOL
		. 'quizzes.push(newQuiz);' . PHP_EOL;
	fwrite($f, $resultFile);
	fclose($f);

	if ($noErrors) {
		exit('Nie odnotowano bledow.');
	} else {
		die('Podczas przygotowywania pytan wystapily bledy - sprawdz plik logow.');
	}
}
