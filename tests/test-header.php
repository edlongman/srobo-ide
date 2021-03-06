<?php

define('IN_TESTS', 1);
require_once('include/main.php');

function __test_value($stuff)
{
	if (is_bool($stuff))
		return $stuff ? 'true' : 'false';
	if (is_integer($stuff) ||
	    is_float($stuff))
		return $stuff;
	if (is_string($stuff))
		return "'$stuff'";
	ob_start();
	var_dump($stuff);
	$stuff = ob_get_contents();
	ob_end_clean();
	return trim($stuff);
}

function __test($cond, $message, $frame = 1, $file = false)
{
	if ($cond)
		return;
	$bt = debug_backtrace(false);
	$frame = $bt[$frame];
	$line = $frame['line'];
	if ($file)
	{
		echo "Test failed in " . $frame['file'] . " on line $line: $message\n";
	}
	else
	{
		echo "Test failed on line $line: $message\n";
	}
	exit(1);
}

function test_abort_exception($exception)
{
	echo "Exception '" . $exception->getMessage() . "' (" . $exception->getCode() . ")\n";
	echo "\tthrown in " . $exception->getFile() . " line " . $exception->getLine() . "\n";
	echo $exception->getTraceAsString();
	exit(1);
}

function test_unreachable($message)
{
	__test(false, $message);
}

function test_true($cond, $message)
{
	test_equal($cond, true, $message);
}

function test_false($cond, $message)
{
	test_equal($cond, false, $message);
}

function test_empty($a, $message)
{
	__test(empty($a), $message);
}

function test_nonempty($a, $message)
{
	__test(!empty($a), $message);
}

function test_null($a, $message)
{
	test_same($a, null, $message);
}

function test_nonnull($a, $message)
{
	test_notsame($a, null, $message);
}

function test_between($actual, $lower, $upper, $message)
{
	__test($actual > $lower && $actual < $upper,
	       $message . " (expected between " . __test_value($lower) . " and " . __test_value($upper) . ", got " . __test_value($actual) . ")");
}

function test_same($a, $b, $message)
{
	__test($a === $b, $message . " (expected same as " . __test_value($b) . ", got " . __test_value($a) . ")");
}

function test_notsame($a, $b, $message)
{
	__test($a !== $b, $message . " (expected not same as " . __test_value($b) . ")");
}

function test_equal($a, $b, $message)
{
	__test($a == $b, $message . " (expected " . __test_value($b) . ", got " . __test_value($a) . ")");
}

function test_nonequal($a, $b, $message)
{
	__test($a != $b, $message . " (expected not equal to " . __test_value($b) . ")");
}

function test_existent($path, $message)
{
	__test(file_exists($path), "Path '$path' should exist: $message");
}

function test_is_file($path, $message)
{
	__test(file_exists($path), "File '$path' should exist (and be a file), but didn't: $message");
	__test(is_file($path), "Path '$path' should be a file, but was something else: $message");
}

function test_is_dir($path, $message)
{
	__test(file_exists($path), "Directory '$path' should exist (and be a directory), but didn't: $message");
	__test(is_dir($path), "Path '$path' should be a directory, but was something else: $message");
}

function test_nonexistent($path, $message)
{
	__test(!file_exists($path), "Path '$path' shouldn't exist: $message");
}

function test_type($a, $t, $message)
{
	$type = gettype($a);
	__test($type == $t, $message . " (expected $t, got $type)");
}

function test_class($a, $c, $message)
{
	$class = get_class($a);
	__test($class == $c, $message . " (expected $c, got $class)");
}

function test_exception($callback, $code, $message)
{
	try
	{
		call_user_func($callback);
		__test(false, $message . " (did not throw: $code)");
	}
	catch (Exception $e)
	{
		$rcode = $e->getCode();
		$emsg = $e->getMessage();
		__test($rcode == $code, $message . " (wrong code, expected $code, got $rcode: \"$emsg\")");
	}
}

error_reporting(E_ALL | E_STRICT);

function __error_handler($errno, $errstr, $errfile, $errline)
{
	__test($errno == 0, "PHP error: $errstr (line $errline in $errfile)", 2, true);
}

set_error_handler('__error_handler');

function skip_test()
{
	echo "___SKIP_TEST";
	exit(0);
}

function section($label)
{
	echo ucwords("\n -- $label -- \n\n");
}

function subsection($label)
{
	echo "\n$label\n";
}

function cleanCreate($path)
{
	// while it's not nice to have conditionals in tests,
	// this avoids an error about the target not existing
	// without hiding other failure modes of the deletion.
	if (file_exists($path))
	{
		delete_recursive($path);
	}
	mkdir_full($path);
}
